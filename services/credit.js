const repo = require('../repositories/economy');
const { DAY, check, days } = require('../domain/money');
const { debtValue, depositValue } = require('../domain/rules');
async function assets(db, user, now) {
    const loans = await repo.loans(db,user.id), holdings = await repo.holdings(db,user.id);
    const savings = await repo.savings(db,user.id), terms = await repo.terms(db,user.id);
    const debt = loans.reduce((s,l) => s+debtValue(l,now),0n);
    const stock = holdings.reduce((s,h) => s+BigInt(h.quantity)*BigInt(h.price),0n);
    let deposits = savings ? depositValue(savings.principal,savings.rate,days(savings.started_at,now),user.credit).total : 0n;
    for (const t of terms) deposits += depositValue(t.principal,t.rate,Math.min(t.period,days(t.opened_at,now)),user.credit,true).total;
    const escrow=await repo.one(db,'SELECT COALESCE(SUM(bet),0) AS total FROM games WHERE user_id=?',[user.id]);
    return { debt,stock,net:user.balance+stock+deposits+BigInt(escrow.total)-debt,loans };
}
async function change(db,user,credit,reason,now) {
    await repo.rows(db,'INSERT INTO credit_history(user_id,old_credit,new_credit,reason,created_at) VALUES (?,?,?,?,?)',[user.id,user.credit,credit,reason,now]);
    user.credit=credit; user.credit_changed_at=now;
}
async function downgrade(db,user,now,{inactivity=true}={}) {
    if(user.credit===4) return false;
    const loans=await repo.loans(db,user.id);
    const grace=user.credit===2 ? 3*DAY : 0;
    const overdue=loans.some(l=>l.due_at && debtValue(l,now)>0n && +now>+new Date(l.due_at)+grace);
    const inactive=inactivity && user.credit<=2 && +now-+new Date(user.economic_at)>=(user.credit===1?7:14)*DAY;
    const loss=await repo.one(db,'SELECT COALESCE(SUM(net),0) AS net FROM gambling_history WHERE user_id=? AND created_at>=?',[user.id,user.credit_changed_at]);
    if(overdue || inactive || (user.credit===3 && BigInt(loss.net)<-500000n)) {
        await change(db,user,user.credit+1,overdue?'overdue':inactive?'inactivity':'gambling_loss',now); return true;
    }
    return false;
}
async function upgrade(db,user,now) {
    check(user.credit>1,'이미 최고 신용등급입니다.');
    const a=await assets(db,user,now);
    check(a.net >= (user.credit===2?2000000n:500000n),'신용등급 상승에 필요한 순자산이 부족합니다.');
    if(user.credit===2) {
        check(BigInt(user.donations)>=500000n,'누적 기부액 500,000시기가 필요합니다.');
        check(days(user.joined_at,now)>=7,'가입 후 7일이 지나야 합니다.');
    } else {
        const wait=user.credit===3?7:14;
        check(days(user.credit_changed_at,now)>=wait,`현재 등급에서 ${wait}일이 지나야 합니다.`);
        const recent=await repo.one(db,'SELECT id FROM gambling_history WHERE user_id=? AND created_at>? LIMIT 1',[user.id,new Date(+now-wait*DAY)]);
        const active=await repo.one(db,'SELECT user_id FROM games WHERE user_id=? AND updated_at>? LIMIT 1',[user.id,new Date(+now-wait*DAY)]);
        check(!recent&&!active,`최근 ${wait}일간 도박 이력이 없어야 합니다.`);
        if(user.credit===4) check(a.debt===0n,'모든 빚을 상환해야 합니다.');
    }
    await change(db,user,user.credit-1,'upgrade_request',now);
    return {credit:user.credit};
}
module.exports={assets,change,downgrade,upgrade};
