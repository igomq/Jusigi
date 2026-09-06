const test=require('node:test');const assert=require('node:assert/strict');
const {getPool,close,transaction}=require('../../db/pool');
const {Economy}=require('../../services/economy');const {Market}=require('../../services/market');
const {DAY,DomainError}=require('../../domain/money');const rules=require('../../domain/rules');
const config=require('../../config');const repo=require('../../repositories/economy');
let time=new Date('2026-09-07T00:00:00Z'),counter=0;
const economy=new Economy({clock:()=>time,random:()=>0});
const idBase=String(Date.now())+'000';let userCounter=0;
const request=()=>`integration-${idBase}-${++counter}`;
const run=(id,op,args={},key=request())=>economy.execute(id,key,op,args);
async function user(balance=100000) {const id=idBase+String(++userCounter);await run(id,'signup');if(balance!==100000)await repo.rows(getPool(),'UPDATE users SET balance=? WHERE id=?',[String(balance),id]);return id;}
async function row(id) {return repo.one(getPool(),'SELECT * FROM users WHERE id=?',[id]);}
test.before(()=>assert.match(config.db.database,/_test$/,'Integration suite requires a separate *_test database'));
test.after(close);
test('real MySQL economy regressions',async t=>{
    await t.test('signup defaults, idempotency, concurrent donation cannot overspend',async()=>{
        const id=await user();assert.equal((await row(id)).balance,'100000');assert.equal((await row(id)).credit,2);
        const key=request();const [a,b]=await Promise.all([run(id,'donate',{amount:10000},key),run(id,'donate',{amount:10000},key)]);assert.deepEqual(a,b);assert.equal((await row(id)).balance,'90000');
        await assert.rejects(run(id,'donate',{amount:20000},key),DomainError);
        const outcomes=await Promise.allSettled([run(id,'donate',{amount:60000}),run(id,'donate',{amount:60000})]);
        assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal((await row(id)).balance,'30000');
    });
    await t.test('loan additional tranches, daily compound, credit snapshot and partial repayment clock',async()=>{
        const id=await user(1000000);await run(id,'loan',{amount:100000});
        await assert.rejects(run(id,'loan',{amount:1}),DomainError);
        time=new Date(+time+DAY);await repo.rows(getPool(),'UPDATE users SET credit=1 WHERE id=?',[id]);
        await run(id,'loan',{amount:100000});
        let loans=await repo.rows(getPool(),'SELECT * FROM loans WHERE user_id=? ORDER BY id',[id]);
        assert.deepEqual(loans.map(l=>l.rate),[3000000,1000000]);
        let snap=await run(id,'snapshot');assert.equal(snap.debt,'203000');
        await run(id,'repay',{amount:1000});snap=await run(id,'snapshot');assert.equal(snap.debt,'202000');
        time=new Date(+time+DAY);snap=await run(id,'snapshot');assert.equal(snap.debt,'206060');
        loans=await repo.rows(getPool(),'SELECT * FROM loans WHERE user_id=? ORDER BY id',[id]);assert.equal(loans[0].principal,'100000');
    });
    await t.test('savings principal reset and tax, no credit activity reset by deposits',async()=>{
        const id=await user(1000000);await run(id,'savingsDeposit',{amount:100000});
        time=new Date(+time+DAY*2);const result=await run(id,'savingsDeposit',{amount:10000});
        assert.equal(result.principal,'110555');assert.equal(result.tax,'45');
        assert.equal((await run(id,'savingsWithdraw',{amount:50000})).principal,'60555');
        assert.equal((await row(id)).balance,'940000');
        assert.equal((await run(id,'savingsWithdraw')).principal,'0');
        assert.equal((await row(id)).balance,'1000555');
    });
    await t.test('multiple fixed term plans and independent maturity',async()=>{
        const id=await user(1000000);const a=await run(id,'termOpen',{amount:100000,period:2});const b=await run(id,'termOpen',{amount:200000,period:3});
        assert.notEqual(a.planId,b.planId);await assert.rejects(run(id,'termWithdraw',{planId:a.planId}),DomainError);
        time=new Date(+time+DAY*2);await run(id,'termWithdraw',{planId:a.planId});
        assert.equal((await repo.rows(getPool(),'SELECT id FROM term_deposits WHERE user_id=?',[id])).length,1);
        await assert.rejects(run(id,'termWithdraw',{planId:b.planId}),DomainError);
        time=new Date(+time+DAY);await run(id,'termWithdraw');assert.equal((await repo.rows(getPool(),'SELECT id FROM term_deposits WHERE user_id=?',[id])).length,0);
    });
    await t.test('trade repeat buys do not double count; partial sale preserves weighted cost and fees',async()=>{
        const id=await user(1000000),symbol='곰큐항공';
        await repo.rows(getPool(),'UPDATE stock_prices SET price=100 WHERE symbol=?',[symbol]);await run(id,'trade',{side:'buy',symbol,quantity:'10'});
        await repo.rows(getPool(),'UPDATE stock_prices SET price=200 WHERE symbol=?',[symbol]);await run(id,'trade',{side:'buy',symbol,quantity:'5'});
        let h=await repo.one(getPool(),'SELECT * FROM holdings WHERE user_id=?',[id]);assert.equal(h.quantity,'15');assert.equal(h.total_cost,'2000');
        await repo.rows(getPool(),'UPDATE stock_prices SET price=150 WHERE symbol=?',[symbol]);const sale=await run(id,'trade',{side:'sell',symbol,quantity:'3'});assert.equal(sale.fee,'22');
        h=await repo.one(getPool(),'SELECT * FROM holdings WHERE user_id=?',[id]);assert.equal(h.quantity,'12');assert.equal(h.total_cost,'1600');
        await assert.rejects(run(id,'trade',{side:'sell',symbol,quantity:'1.5'}),DomainError);
        const balance=(await row(id)).balance;await assert.rejects(run(id,'trade',{side:'buy',symbol,quantity:'999999999999'}));assert.equal((await row(id)).balance,balance);
        const broken=new Economy({clock:()=>time,transact:fn=>transaction(db=>fn({execute:async(sql,p)=>{if(sql.startsWith('INSERT INTO stock_trades'))throw Error('injected trade audit failure');return db.execute(sql,p);}}))});
        await assert.rejects(broken.execute(id,request(),'trade',{side:'sell',symbol,quantity:'1'}));
        assert.equal((await row(id)).balance,balance);assert.equal((await repo.one(getPool(),'SELECT quantity FROM holdings WHERE user_id=?',[id])).quantity,'12');
    });
    await t.test('bankruptcy rollback on injected mid-write failure and rejoin retention',async()=>{
        const id=await user(1000000);await run(id,'loan',{amount:10000});await run(id,'savingsDeposit',{amount:10000});await run(id,'termOpen',{amount:10000,period:1});await run(id,'gamble',{game:'oddeven',amount:10000,choice:'odd'});
        const broken=new Economy({clock:()=>time,transact:fn=>transaction(db=>fn({execute:async(sql,p)=>{if(sql.startsWith('DELETE FROM term_deposits'))throw Error('injected');return db.execute(sql,p);}}))});
        const before=(await row(id)).balance;await assert.rejects(broken.execute(id,request(),'bankrupt'));
        assert.equal((await row(id)).balance,before);assert.equal((await repo.rows(getPool(),'SELECT * FROM loans WHERE user_id=?',[id])).length,1);
        const original=await row(id);await run(id,'withdraw');assert.equal((await row(id)).status,'withdrawn');await assert.rejects(run(id,'donate',{amount:1}),DomainError);
        await run(id,'signup');const after=await row(id);assert.equal(after.balance,'70000');assert.equal(after.credit,3);assert.equal(+after.joined_at,+original.joined_at);
        for(const table of ['loans','savings','term_deposits','holdings','gambling_history'])assert.equal((await repo.rows(getPool(),`SELECT * FROM ${table} WHERE user_id=?`,[id])).length,0);
        assert.equal((await repo.rows(getPool(),'SELECT * FROM casino_state WHERE user_id=?',[id])).length,1);
    });
    await t.test('credit upgrades, inactivity and gambling loss downgrade centralized',async()=>{
        const id=await user(3000000);await run(id,'donate',{amount:500000});
        await repo.rows(getPool(),'UPDATE users SET joined_at=? WHERE id=?',[new Date(+time-7*DAY),id]);await run(id,'upgradeCredit');assert.equal((await row(id)).credit,1);
        time=new Date(+time+7*DAY);await run(id,'donate',{amount:1});assert.equal((await row(id)).credit,2);
        await repo.rows(getPool(),'UPDATE users SET credit=3,credit_changed_at=?,economic_at=? WHERE id=?',[time,time,id]);
        await repo.rows(getPool(),"INSERT INTO gambling_history(user_id,type,bet,gross,tax,net,outcome,created_at) VALUES (?,'slots',500001,-500001,0,-500001,'{}',?)",[id,time]);
        await run(id,'snapshot');assert.equal((await row(id)).credit,4);
        time=new Date(+time+14*DAY);await run(id,'upgradeCredit');assert.equal((await row(id)).credit,3);
    });
    await t.test('due-date downgrade and grade-two 3-day grace',async()=>{
        const id=await user(1000000);await run(id,'loan',{amount:10000});
        await repo.rows(getPool(),'UPDATE loans SET due_at=? WHERE user_id=?',[new Date(+time-2*DAY),id]);await run(id,'snapshot');assert.equal((await row(id)).credit,2);
        await repo.rows(getPool(),'UPDATE loans SET due_at=? WHERE user_id=?',[new Date(+time-3*DAY-1),id]);await run(id,'snapshot');assert.equal((await row(id)).credit,3);
        await run(id,'snapshot');assert.equal((await row(id)).credit,4);
    });
    await t.test('gamble caps/cooldown/quickpass/tax and concurrent requests',async()=>{
        const id=await user(20000000);await repo.rows(getPool(),'UPDATE users SET credit=3 WHERE id=?',[id]);await assert.rejects(run(id,'gamble',{game:'slots',amount:500001}),DomainError);
        await repo.rows(getPool(),'UPDATE users SET credit=4 WHERE id=?',[id]);await assert.rejects(run(id,'gamble',{game:'slots',amount:100001}),DomainError);
        await repo.rows(getPool(),'UPDATE users SET credit=1 WHERE id=?',[id]);const win=await run(id,'gamble',{game:'oddeven',amount:100000,choice:'odd'});assert.equal(win.net,'1800');assert.equal(win.tax,'200');
        await assert.rejects(run(id,'gamble',{game:'oddeven',amount:1,choice:'odd'}),DomainError);
        await run(id,'buy',{item:'quick_pass'});await assert.rejects(run(id,'buy',{item:'quick_pass'}),DomainError);
        time=new Date(+time+10*60000);const both=await Promise.allSettled([run(id,'gamble',{game:'oddeven',amount:1,choice:'odd'}),run(id,'gamble',{game:'oddeven',amount:1,choice:'even'})]);assert.equal(both.filter(r=>r.status==='fulfilled').length,1);
        await run(id,'gamble',{game:'slots',amount:1000});
    });
    await t.test('item purchase, upgrade, usage, effect credit and lifecycle',async()=>{
        const id=await user(50000000);
        await repo.rows(getPool(),"UPDATE item_definitions SET released=TRUE,price=1000 WHERE id IN ('positive','hacker')");
        try {
            const purchase=await run(id,'buy',{item:'positive'});assert.equal(purchase.grade,'AWKWARD');
            await run(id,'upgradeItem',{inventoryId:purchase.inventoryId});
            await repo.rows(getPool(),'UPDATE users SET credit=4 WHERE id=?',[id]);await assert.rejects(run(id,'upgradeItem',{inventoryId:purchase.inventoryId}),DomainError);
            await repo.rows(getPool(),'UPDATE users SET credit=2 WHERE id=?',[id]);const hacker=await run(id,'buy',{item:'hacker'});
            await assert.rejects(run(id,'upgradeItem',{inventoryId:hacker.inventoryId}),DomainError);
            await assert.rejects(run(id,'useItem',{inventoryId:hacker.inventoryId}),DomainError);
            await repo.rows(getPool(),'UPDATE inventory SET grade=1 WHERE id=?',[hacker.inventoryId]);
            await run(id,'useItem',{inventoryId:hacker.inventoryId});assert.equal((await row(id)).credit,1);
            await assert.rejects(run(id,'useItem',{inventoryId:hacker.inventoryId}),DomainError);
            const symbol='곰큐항공';await repo.rows(getPool(),'UPDATE stock_prices SET price=100 WHERE symbol=?',[symbol]);await run(id,'trade',{side:'buy',symbol,quantity:'100'});await repo.rows(getPool(),'UPDATE stock_prices SET price=50 WHERE symbol=?',[symbol]);const sale=await run(id,'trade',{side:'sell',symbol,quantity:'100'});assert.equal(sale.itemEffect,'750');assert.equal(sale.fee,'0');
        } finally {await repo.rows(getPool(),"UPDATE item_definitions SET released=FALSE,price=NULL WHERE id IN ('positive','hacker')");}
    });
    await t.test('legacy session escrow, restart, stop and duplicate final settlement',async()=>{
        const id=await user(1000000);const start=await run(id,'legacyStart',{game:'fiveask',bet:100000});assert.equal((await row(id)).balance,'900000');
        const restarted=new Economy({clock:()=>time,random:()=>0});await restarted.execute(id,request(),'legacyAction',{session:start.session,action:'input'});
        const key=request();const a=await restarted.execute(id,key,'legacyAction',{session:start.session,action:'guess',guess:'1'});const b=await restarted.execute(id,key,'legacyAction',{session:start.session,action:'guess',guess:'1'});assert.deepEqual(a,b);assert.equal((await row(id)).balance,'1810000');
        await assert.rejects(run(id,'legacyAction',{session:start.session,action:'guess',guess:'1'}),DomainError);
    });
    await t.test('active gambling blocks credit upgrade and empty stop does not reset activity',async()=>{
        const id=await user(1000000);const old=new Date(+time-8*DAY);
        await repo.rows(getPool(),'UPDATE users SET credit=3,credit_changed_at=?,economic_at=? WHERE id=?',[old,old,id]);
        await run(id,'legacyStop');assert.equal(+(await row(id)).economic_at,+old);
        await run(id,'legacyStart',{game:'fiveask',bet:100000});
        assert.equal((await run(id,'snapshot')).netAssets,'1000000');
        await assert.rejects(run(id,'upgradeCredit'),DomainError);
    });
    await t.test('market durable ticks, six updates/news and concurrency lock',async()=>{
        const state=await repo.one(getPool(),'SELECT * FROM market_state WHERE id=1');time=new Date(+new Date(state.next_update_at)+1);
        const market=new Market({clock:()=>time,random:()=>0});const count=await Promise.all([market.tick(),market.tick()]);assert.equal(count.filter(Boolean).length,1);
        for(let i=0;i<5;i++){time=new Date(+time+config.interval);await market.tick();}
        const snapshot=await new Market().snapshot();assert.equal(BigInt(snapshot.state.tick),BigInt(state.tick)+6n);assert(snapshot.news.length>=1);assert.equal(snapshot.stocks.length,8);assert.equal(snapshot.history['곰큐항공'].length,Math.min(250,Number(state.tick)+7));
    });
});
