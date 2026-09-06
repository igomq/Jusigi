const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../domain/money');
const r=require('../domain/rules');
test('strict integer parsing excludes partial numbers, floats, NaN and unsafe Numbers',()=>{
    for(const input of ['1.5','1e3',' 3','3x',-1,0,NaN,Infinity,Number.MAX_SAFE_INTEGER+1,null,undefined])assert.throws(()=>m.integer(input));
    assert.equal(m.integer('9007199254740993'),9007199254740993n);
});
test('loan limits by grade subtract debt before multiplying and from additional allowance',()=>{
    assert.deepEqual([1,2,3,4].map(c=>r.loanLimit(c,100000n,200000n,0n)),[1000000n,500000n,50000n,0n]);
    assert.equal(r.loanLimit(2,200000n,0n,100000n),150000n);
    assert.equal(r.loanLimit(2,300000n,0n,100000n),400000n);
    assert.equal(r.loanLimit(3,100n,0n,1000n),0n);
});
test('compound complete 24h, millisecond boundaries, fixed snapshot rate',()=>{
    const start=new Date('2026-01-01T23:59:59.999Z');
    assert.equal(m.days(start,new Date(+start+m.DAY-1)),0);
    assert.equal(m.days(start,new Date(+start+m.DAY)),1);
    const loan={balance:'100000',rate:r.CREDIT[2].loan,accrued_at:start};
    assert.equal(r.debtValue(loan,new Date(+start+2*m.DAY)),106090n);
    assert.equal(r.debtValue(loan,new Date(+start-1)),100000n);
    assert.equal(m.compound(101n,3000000,2),107n);
});
test('savings simple interest and tax only on interest, per-grade benefits',()=>{
    const value=r.depositValue(100000n,300000,2,2);
    assert.deepEqual(value,{interest:600n,tax:45n,total:100555n});
    assert.deepEqual([1,2,3,4].map(c=>r.depositValue(100000n,1000000,1,c).tax),[0n,75n,150n,150n]);
    assert.equal(r.depositValue(100000n,300000,0,2).total,100000n);
});
test('term percent conversion, rate cap and fixed-period compound',()=>{
    assert.equal(r.termRate(2,1),550);
    assert.equal(r.termRate(1,10),85000);
    assert.deepEqual([1,2,3,4].map(c=>r.termRate(c,1000)),[7500000,5000000,3000000,1000000]);
    assert.equal(r.depositValue(100000n,3000000,2,2,true).total,105634n);
});
test('stock weighted total cost, partial disposal conservation, equal-price nonloss fees',()=>{
    const purchaseCost=10n*100n+5n*200n;
    let a=r.sell({quantity:3n,totalCost:purchaseCost,held:15n,price:150n,credit:3});
    assert.equal(a.cost,400n);assert.equal(a.fee,45n);assert.equal(a.realized,5n);
    const b=r.sell({quantity:12n,totalCost:purchaseCost-a.cost,held:12n,price:90n,credit:3});
    assert.equal(a.cost+b.cost,purchaseCost);assert.equal(b.fee,21n);
    assert.deepEqual([1,2,3,4].map(credit=>r.sell({quantity:10n,totalCost:1000n,held:10n,price:100n,credit}).fee),[0n,50n,100n,100n]);
    assert.equal(r.sell({quantity:10n,totalCost:1000n,held:10n,price:90n,credit:2}).fee,9n);
});
test('slot table precedence, odd/even +-2%, gambling tax never credit-discounted',()=>{
    const cases=[[[7,7,7],20000n],[[7,7,1],4000n],[[3,3,3],5000n],[[3,3,7],3000n],[[1,2,3],-100000n]];
    for(const [result,gross] of cases)assert.equal(r.gamble('slots',100000n,result).gross,gross);
    assert.deepEqual(r.gamble('oddeven',100000n,[1],'odd'),{gross:2000n,tax:200n,net:1800n});
    assert.equal(r.gamble('oddeven',100000n,[2],'odd').net,-2000n);
});
test('item table probabilities and target-based upgrade failure, credit penalties',()=>{
    assert.equal(r.GRADES.length,11);
    assert.deepEqual([0,.1499,.15,.5499,.55,.7999,.8,.9499,.95,.99999].map(r.acquisitionGrade),[0,0,1,1,2,2,3,3,4,4]);
    assert.equal(r.upgradeResult(3,.99),3);assert.equal(r.upgradeResult(4,.99),3);assert.equal(r.upgradeResult(5,.01),6);
    assert(r.upgradeCost(0)>0n);assert.throws(()=>r.upgradeCost(10));
    assert.deepEqual([1,2,3,4].map(c=>r.itemRate(15000000,4,c)),[17250000,17250000,8625000,0]);
    assert.equal(r.itemRate(10000000,10,1),30000000);
});
test('market range endpoints exactly match active specification',()=>{
    for(const [sentiment,[min,max]] of Object.entries(r.PRICE_RANGES)){
        assert.equal(r.nextPrice(100000n,sentiment,0),BigInt(100000*(10000+min)/10000));
        assert.equal(r.nextPrice(100000n,sentiment,.99999999),BigInt(100000*(10000+max)/10000));
    }
});
