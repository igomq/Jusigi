const crypto = require('node:crypto');
const { transaction } = require('../db/pool');
const repo = require('../repositories/economy');
const credit = require('./credit');
const rules = require('../domain/rules');
const { check,integer,DAY,days,json,MAX,floorRate } = require('../domain/money');
const config = require('../config');
const { randomInt } = require('node:crypto');
const roll = () => randomInt(0,100000000)/100000000;
const noActivity = new Set(['signup','snapshot','creditInfo','upgradeCredit','savingsDeposit','savingsWithdraw','termOpen','termWithdraw','inventory','shop']);
class Economy {
    constructor({ transact=transaction, clock=()=>new Date(), random=roll }={}) { this.transact=transact; this.clock=clock; this.random=random; }
    async execute(id,requestId,operation,args={}) {
        check(typeof id==='string' && /^\d{1,32}$/.test(id),'올바른 사용자 ID가 필요합니다.');
        check(typeof requestId==='string' && requestId.length>0 && requestId.length<=100,'요청 ID가 필요합니다.');
        check(Object.hasOwn(handlers,operation),'지원하지 않는 작업입니다.');
        const fingerprint=crypto.createHash('sha256').update(json(args)).digest('hex');
        return this.transact(async db=>{
            const now=this.clock();
            await repo.rows(db,'INSERT IGNORE INTO requests(id,user_id,operation,fingerprint,created_at) VALUES (?,?,?,?,?)',[requestId,id,operation,fingerprint,now]);
            const request=await repo.one(db,'SELECT * FROM requests WHERE id=? FOR UPDATE',[requestId]);
            check(request.user_id===id && request.operation===operation && request.fingerprint===fingerprint,'이미 다른 작업에 사용된 요청입니다.');
            if(request.result!==null) return typeof request.result==='string'?JSON.parse(request.result):request.result;
            if(operation==='signup') await repo.rows(db,'INSERT IGNORE INTO users(id,joined_at,credit_changed_at,economic_at) VALUES (?,?,?,?)',[id,now,now,now]);
            const user=await repo.account(db,id);
            check(user,'먼저 /가입 명령어를 사용해주세요.');
            check(operation==='signup'||user.status==='active','탈퇴한 계정입니다. /가입 명령어를 사용해주세요.');
            user.balance=BigInt(user.balance);
            const before=user.balance;
            const lowered=operation!=='signup'&&await credit.downgrade(db,user,now);
            const ctx={db,user,now,requestId,random:this.random};
            ctx.checkGamble=(game,bet)=>checkGamble(ctx,game,bet);
            ctx.recordGamble=(game,bet,gross,outcome)=>recordGamble(ctx,game,bet,gross,outcome);
            ctx.awardDrop=game=>require('./items').awardDrop(ctx,game);
            ctx.stopMinigames=()=>require('./minigames').minigameStop(ctx);
            const result=await handlers[operation](ctx,args);
            const activity=!noActivity.has(operation)
                && (operation!=='legacyAction'||result.kind==='legacy_settled')
                && (!['legacyStop','minigameStop'].includes(operation)||result.stopped.length>0);
            if(activity) user.economic_at=now;
            if(!lowered && operation!=='signup' && operation!=='bankrupt' && operation!=='withdraw') await credit.downgrade(db,user,now,{inactivity:false});
            check(user.balance>=0n&&user.balance<=MAX,'잔액이 허용 범위를 벗어났습니다.');
            await repo.rows(db,'UPDATE users SET balance=?,credit=?,credit_changed_at=?,economic_at=?,status=?,withdrawn_at=?,donations=?,last_loan_at=? WHERE id=?',[user.balance.toString(),user.credit,user.credit_changed_at,user.economic_at,user.status,user.withdrawn_at,user.donations.toString(),user.last_loan_at,user.id]);
            const output=JSON.parse(json({...result,balance:user.balance,credit:user.credit}));
            await repo.rows(db,'INSERT INTO economic_events(user_id,request_id,type,balance_delta,details,created_at) VALUES (?,?,?,?,?,?)',[id,requestId,operation,(user.balance-before).toString(),json(output),now]);
            await repo.rows(db,'UPDATE requests SET result=? WHERE id=?',[json(output),requestId]);
            return output;
        });
    }
}
async function reset(ctx,withdraw=false) {
    const {db,user,now}=ctx;
    // Explicit list: user, donations, cooldown and perpetual items/entitlements are retained.
    for(const table of ['loans','savings','term_deposits','holdings','gambling_history','games']) await repo.rows(db,`DELETE FROM ${table} WHERE user_id=?`,[user.id]);
    await repo.rows(db,"UPDATE minigame_sessions SET status='complete',finished_at=? WHERE user_id=? AND status='active'",[now,user.id]);
    await credit.change(db,user,3,withdraw?'withdrawal':'bankruptcy',now);
    user.balance=70000n; user.status=withdraw?'withdrawn':'active'; user.withdrawn_at=withdraw?now:null;
    return {message:withdraw?'탈퇴되었습니다. 재가입 시 신용3 / 70,000시기가 적용됩니다.':'신용3 / 70,000시기로 재조정되었습니다.'};
}
async function checkGamble(ctx,game,bet) {
    const {db,user,now}=ctx;
    check(bet<=user.balance,'보유 금액보다 많이 베팅할 수 없습니다.');
    check(!rules.CREDIT[user.credit].gamble||bet<=rules.CREDIT[user.credit].gamble,'신용등급별 도박 한도를 초과했습니다.');
    const pass=await repo.one(db,"SELECT user_id FROM entitlements WHERE user_id=? AND type='quick_pass'",[user.id]);
    const state=await repo.one(db,'SELECT last_played_at FROM casino_state WHERE user_id=? AND type=?',[user.id,game]);
    const cooldown=(pass?10:60)*60000;
    check(!state || +now-+new Date(state.last_played_at)>=cooldown,`이 게임의 쿨타임은 ${pass?10:60}분입니다.`);
}
async function recordGamble(ctx,game,bet,gross,outcome) {
    const {db,user,now}=ctx;
    const {tax,net}=rules.gamblingSettlement(gross);
    user.balance+=net;
    await repo.rows(db,'INSERT INTO gambling_history(user_id,type,bet,gross,tax,net,outcome,created_at) VALUES (?,?,?,?,?,?,?,?)',[user.id,game,bet.toString(),gross.toString(),tax.toString(),net.toString(),json(outcome),now]);
    await repo.rows(db,'INSERT INTO casino_state(user_id,type,last_played_at) VALUES (?,?,?) ON DUPLICATE KEY UPDATE last_played_at=VALUES(last_played_at)',[user.id,game,now]);
    return {gross,tax,net,outcome};
}
const handlers={
    async signup(ctx) { if(ctx.user.status==='withdrawn') return reset(ctx); return {message:'가입 상태입니다.',joinedAt:ctx.user.joined_at}; },
    bankrupt:ctx=>reset(ctx), withdraw:ctx=>reset(ctx,true),
    async donate({db,user},args) {const amount=integer(args.amount);check(user.balance>=amount,'잔액이 부족합니다.');user.balance-=amount;user.donations=BigInt(user.donations)+amount;return {donated:amount,totalDonations:user.donations};},
    async loan({db,user,now},args) {
        const amount=integer(args.amount);check(user.credit<4,'신용4등급은 대출할 수 없습니다.');
        check(!user.last_loan_at||+now-+new Date(user.last_loan_at)>=DAY,'대출은 24시간에 한 번 가능합니다.');
        const a=await credit.assets(db,user,now), available=rules.loanLimit(user.credit,user.balance,a.stock,a.debt);
        check(amount<=available,`추가 대출 가능 금액: ${available}시기`);
        const due=new Date(+now+config.loanTermDays*DAY);
        await repo.rows(db,'INSERT INTO loans(user_id,principal,balance,rate,opened_at,accrued_at,due_at) VALUES (?,?,?,?,?,?,?)',[user.id,amount.toString(),amount.toString(),rules.CREDIT[user.credit].loan,now,now,due]);
        user.balance+=amount;user.last_loan_at=now;return {borrowed:amount,rate:rules.CREDIT[user.credit].loan,dueAt:due};
    },
    async repay({db,user,now},args) {
        const amount=integer(args.amount), loans=await repo.loans(db,user.id);
        check(user.balance>=amount,'잔액이 부족합니다.');
        check(loans.reduce((s,l)=>s+rules.debtValue(l,now),0n)>=amount,'상환액이 현재 부채보다 큽니다.');
        let left=amount;
        for(const loan of loans) {
            if(!left) break;
            const current=rules.debtValue(loan,now), paid=left<current?left:current;
            const interest=current-BigInt(loan.principal), principalPaid=paid>interest?paid-interest:0n;
            if(current===paid) await repo.rows(db,'DELETE FROM loans WHERE id=?',[loan.id]);
            else await repo.rows(db,'UPDATE loans SET principal=?,balance=?,accrued_at=? WHERE id=?',[(BigInt(loan.principal)-principalPaid).toString(),(current-paid).toString(),new Date(+new Date(loan.accrued_at)+days(loan.accrued_at,now)*DAY),loan.id]);
            left-=paid;
        }
        user.balance-=amount;return {repaid:amount};
    },
    async savingsDeposit(ctx,args) {return savingsChange(ctx,integer(args.amount));},
    async savingsWithdraw(ctx,args) {return savingsChange(ctx,args.amount==null?null:-integer(args.amount));},
    async termOpen({db,user,now},args) {
        const amount=integer(args.amount),period=Number(integer(args.period));
        check(period<=36500,'예금 기간이 저장 범위를 초과합니다.');check(user.balance>=amount,'잔액이 부족합니다.');
        const rate=rules.termRate(user.credit,period);
        // Validate the future amount now rather than creating an unredeemable plan.
        rules.depositValue(amount,rate,period,user.credit,true);
        const result=await repo.rows(db,'INSERT INTO term_deposits(user_id,principal,rate,period,opened_at,matures_at) VALUES (?,?,?,?,?,?)',[user.id,amount.toString(),rate,period,now,new Date(+now+period*DAY)]);
        user.balance-=amount;return {planId:String(result.insertId),principal:amount,period,rate};
    },
    async termWithdraw({db,user,now},args) {
        const plans=await repo.terms(db,user.id);
        const selected=args.planId?plans.filter(p=>String(p.id)===String(args.planId)):plans.filter(p=>+new Date(p.matures_at)<=+now);
        check(selected.length>0,'인출할 만기 플랜이 없습니다.');
        let payout=0n,tax=0n;
        for(const plan of selected) {check(+new Date(plan.matures_at)<=+now,'아직 만기가 아닙니다.');const v=rules.depositValue(plan.principal,plan.rate,plan.period,user.credit,true);payout+=v.total;tax+=v.tax;await repo.rows(db,'DELETE FROM term_deposits WHERE id=?',[plan.id]);}
        user.balance+=payout;return {withdrawn:payout,tax,plans:selected.map(p=>p.id)};
    },
    async upgradeCredit({db,user,now}) {return credit.upgrade(db,user,now);},
    async creditInfo({user}) {return {benefits:rules.CREDIT[user.credit]};},
    async snapshot({db,user,now},args={}) {
        const a=await credit.assets(db,user,now), savings=await repo.savings(db,user.id), plans=await repo.terms(db,user.id);
        return {bankRates:args.bankInfo?rules.CREDIT[user.credit]:undefined,netAssets:a.net,debt:a.debt,availableLoan:rules.loanLimit(user.credit,user.balance,a.stock,a.debt),loans:a.loans.map(l=>({...l,current:rules.debtValue(l,now)})),holdings:await repo.holdings(db,user.id),savings:savings?{...savings,...rules.depositValue(savings.principal,savings.rate,days(savings.started_at,now),user.credit)}:null,plans};
    },
    async trade(ctx,args) {return trade(ctx,args);},
    async gamble(ctx,args) {
        check(['oddeven','slots'].includes(args.game),'지원하지 않는 게임입니다.');
        if(args.game==='oddeven') check(['odd','even'].includes(args.choice),'홀/짝을 선택해주세요.');
        const bet=integer(args.amount);await checkGamble(ctx,args.game,bet);
        const result=Array.from({length:args.game==='slots'?3:1},()=>1+Math.floor(ctx.random()*7));
        // Two equiprobable outcomes for odd/even, independent of the slot's seven symbols.
        if(args.game==='oddeven') result[0]=1+Math.floor(ctx.random()*2);
        const outcome=rules.gamble(args.game,bet,result,args.choice);
        return recordGamble(ctx,args.game,bet,outcome.gross,{numbers:result,choice:args.choice||null});
    },
    async shop({db}) {return {items:await repo.rows(db,'SELECT id,name,type,price FROM item_definitions WHERE released=TRUE AND price IS NOT NULL'),quickPassPrice:'10000000'};},
    async buy({db,user,now,random},args) {
        if(args.item==='quick_pass') {check(user.balance>=10000000n,'잔액이 부족합니다.');check(!await repo.one(db,"SELECT user_id FROM entitlements WHERE user_id=? AND type='quick_pass'",[user.id]),'이미 퀵패스를 보유하고 있습니다.');await repo.rows(db,"INSERT INTO entitlements(user_id,type,purchased_at) VALUES (?,'quick_pass',?)",[user.id,now]);user.balance-=10000000n;return {purchased:'Casino Quick Pass'};}
        const item=await repo.one(db,'SELECT * FROM item_definitions WHERE (id=? OR name=?) AND released=TRUE AND price IS NOT NULL FOR SHARE',[args.item,args.item]);
        check(item,'판매 중인 아이템이 아닙니다.');const cost=BigInt(item.price);check(user.balance>=cost,'잔액이 부족합니다.');
        const grade=rules.acquisitionGrade(random());
        const inserted=await repo.rows(db,'INSERT INTO inventory(user_id,item_id,grade,uses_left,acquired_at) VALUES (?,?,?,?,?)',[user.id,item.id,grade,item.uses,now]);user.balance-=cost;
        return {purchased:item.name,inventoryId:String(inserted.insertId),grade:rules.GRADES[grade]};
    },
    async inventory({db,user}) {return {items:await repo.inventory(db,user.id)};},
    async upgradeItem({db,user,random},args) {
        check(user.credit!==4,'신용4등급은 강화할 수 없습니다.');
        const item=await findItem(db,user,args);check(item.type==='passive','소모형 아이템은 강화할 수 없습니다.');
        const cost=rules.upgradeCost(item.grade);check(user.balance>=cost,'잔액이 부족합니다.');
        const grade=rules.upgradeResult(item.grade,random());user.balance-=cost;
        await repo.rows(db,'UPDATE inventory SET grade=? WHERE id=?',[grade,item.id]);
        return {inventoryId:item.id,oldGrade:rules.GRADES[item.grade],grade:rules.GRADES[grade],cost};
    },
    async useItem({db,user,now,random},args) {
        check(user.credit!==4,'신용4등급에서는 아이템 효과가 비활성화됩니다.');
        const item=await findItem(db,user,args);check(item.type==='consumable','패시브는 보유 시 자동 적용됩니다.');
        check(item.effect==='credit','사용할 수 없는 효과입니다.');
        const effectRate=rules.itemRate(100000000,item.grade,user.credit);
        const activated=user.credit===1 || rules.hackerSucceeds(item.grade,user.credit,random());
        if(user.credit===1) user.balance+=floorRate(5000000n,effectRate);
        else {
            if(activated)await credit.change(db,user,user.credit-1,'hacker_item',now);
        }
        if(item.uses_left===1) await repo.rows(db,'DELETE FROM inventory WHERE id=?',[item.id]);
        else await repo.rows(db,'UPDATE inventory SET uses_left=uses_left-1 WHERE id=?',[item.id]);
        return {used:item.name,activated,remaining:item.uses_left-1};
    }
};
async function findItem(db,user,args) {
    const items=await repo.inventory(db,user.id);
    const matches=items.filter(i=>args.inventoryId?String(i.id)===String(args.inventoryId):i.name===args.item||i.item_id===args.item);
    check(matches.length===1,matches.length?'같은 이름의 아이템이 여러 개입니다. 보유번호를 지정해주세요.':'보유 아이템이 없습니다.');return matches[0];
}
async function savingsChange({db,user,now},delta) {
    const existing=await repo.savings(db,user.id);
    const value=existing?rules.depositValue(existing.principal,existing.rate,days(existing.started_at,now),user.credit):{total:0n,tax:0n};
    if(delta===null) {check(value.total>0n,'인출할 보통예금이 없습니다.');delta=-value.total;}
    check(delta<=user.balance,'잔액이 부족합니다.');check(value.total+delta>=0n,'보통예금이 부족합니다.');
    const principal=value.total+delta;user.balance-=delta;
    await repo.rows(db,'INSERT INTO savings(user_id,principal,rate,started_at) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE principal=VALUES(principal),rate=VALUES(rate),started_at=VALUES(started_at)',[user.id,principal.toString(),rules.CREDIT[user.credit].savings,now]);
    return {principal,tax:value.tax,changed:delta,startedAt:now};
}
async function trade({db,user,now,requestId},args) {
    check(['buy','sell'].includes(args.side),'매수/매도를 선택해주세요.');
    const priceRow=await repo.one(db,'SELECT price FROM stock_prices WHERE symbol=? FOR SHARE',[args.symbol]);check(priceRow,'알 수 없는 종목입니다.');
    const price=BigInt(priceRow.price), holding=await repo.one(db,'SELECT * FROM holdings WHERE user_id=? AND symbol=? FOR UPDATE',[user.id,args.symbol]);
    const held=BigInt(holding?.quantity||0),totalCost=BigInt(holding?.total_cost||0);
    const quantity=integer(args.quantity==='올인'?(args.side==='buy'?user.balance/price:held):args.quantity);
    let cost=quantity*price,fee=0n,effect=0n,realized=0n;
    if(args.side==='buy') {
        check(user.balance>=cost,'잔액이 부족합니다.');check(totalCost+cost<=MAX&&held+quantity<=MAX,'보유 한도를 초과합니다.');user.balance-=cost;
        await repo.rows(db,'INSERT INTO holdings(user_id,symbol,quantity,total_cost) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE quantity=VALUES(quantity),total_cost=VALUES(total_cost)',[user.id,args.symbol,(held+quantity).toString(),(totalCost+cost).toString()]);
    } else {
        check(quantity<=held,'보유 수량이 부족합니다.');
        const items=await repo.inventory(db,user.id);let lossRate=0,profitRate=0;
        for(const i of items.filter(i=>i.type==='passive')) {const rate=rules.itemRate(i.base_rate,i.grade,user.credit);if(i.effect==='loss')lossRate=Math.max(lossRate,rate);if(i.effect==='profit')profitRate=Math.max(profitRate,rate);}
        const sale=rules.sell({quantity,totalCost,held,price,credit:user.credit,lossRate,profitRate});({cost,fee,effect,realized}=sale);user.balance+=sale.payout;
        if(quantity===held)await repo.rows(db,'DELETE FROM holdings WHERE user_id=? AND symbol=?',[user.id,args.symbol]);
        else await repo.rows(db,'UPDATE holdings SET quantity=?,total_cost=? WHERE user_id=? AND symbol=?',[(held-quantity).toString(),(totalCost-cost).toString(),user.id,args.symbol]);
    }
    await repo.rows(db,'INSERT INTO stock_trades(user_id,symbol,request_id,side,quantity,price,cost,fee,item_effect,realized,credit,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',[user.id,args.symbol,requestId,args.side,quantity.toString(),price.toString(),cost.toString(),fee.toString(),effect.toString(),realized.toString(),user.credit,now]);
    return {symbol:args.symbol,side:args.side,quantity,price,cost,fee,itemEffect:effect,realized};
}
Object.assign(handlers,require('./legacy-games').handlers);
Object.assign(handlers,require('./minigames'));
module.exports={Economy,handlers};
