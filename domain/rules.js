const { floorRate, compound, days, check } = require('./money');
const CREDIT = {
    1: { loan: 1000000, savings: 500000, term: 850, cap: 7500000, tax: 0, fee: 0, item: 100000000, gamble: null, dropBonus: 10 },
    2: { loan: 3000000, savings: 300000, term: 550, cap: 5000000, tax: 7500000, fee: 50000000, item: 100000000, gamble: null, dropBonus: 5 },
    3: { loan: 5000000, savings: 200000, term: 380, cap: 3000000, tax: 15000000, fee: 100000000, item: 50000000, gamble: 500000n, dropBonus: 0 },
    4: { loan: 0, savings: 100000, term: 180, cap: 1000000, tax: 15000000, fee: 100000000, item: 0, gamble: 100000n, dropBonus: 0 }
};
function loanLimit(credit, balance, stock, debt) {
    const weighted = BigInt(balance) * 2n + (credit <= 2 ? BigInt(stock) : 0n) - BigInt(debt) * 2n;
    const asset = weighted > 0n ? weighted : 0n;
    const total = credit === 1 ? asset * 5n / 2n : credit === 2 ? asset * 5n / 4n : credit === 3 ? asset / 4n : 0n;
    return total > debt ? total - debt : 0n;
}
function termRate(credit, period) { return Math.min(CREDIT[credit].term * period * period, CREDIT[credit].cap); }
function depositValue(principal, rate, count, credit, term = false) {
    principal = BigInt(principal);
    const interest = term ? compound(principal, rate, count) - principal : floorRate(principal * BigInt(count), rate);
    const tax = floorRate(interest, CREDIT[credit].tax);
    return { interest, tax, total: principal + interest - tax };
}
function debtValue(loan, now) { return compound(loan.balance, loan.rate, days(loan.accrued_at, now)); }
const GRADES = ['AWKWARD','COMMON','UNCOMMON','RARE','EPIC','UNIQUE','MYTHIC','LEGENDARY','HYPE','INEVITABLE','TRANSCENDANT'];
const BONUS = [-5,0,5,10,15,30,40,50,60,80,200];
const UPGRADE = [100,100,100,70,50,30,30,30,5,1,0];
function upgradeCost(grade) { check(grade >= 0 && grade < 10, '최고 등급입니다.'); const target = grade + 2; return BigInt(Math.floor(22.51 * Math.exp(1.36 * target) + 30000 * target ** 2 - 100000)); }
function upgradeResult(grade, roll) { return roll < UPGRADE[grade] / 100 ? grade + 1 : grade + 1 <= 4 ? grade : Math.max(0, grade - 1); }
function acquisitionGrade(roll) { let sum = 0; return [15,40,25,15,5].findIndex(p => (sum += p) > roll * 100); }
function itemRate(base, grade, credit) { return Math.floor(base * (100 + BONUS[grade]) / 100 * CREDIT[credit].item / 100000000); }
const GAME_DROP_PERCENT = { fiveask: 10, nonsense: 5, arithmetic: 10, memory: 15 };
function dropChance(game, credit) { return Object.hasOwn(GAME_DROP_PERCENT,game) ? (GAME_DROP_PERCENT[game]+CREDIT[credit].dropBonus)/100 : 0; }
function hackerSucceeds(grade, credit, roll) { return roll < Math.min(1,itemRate(100000000,grade,credit)/100000000); }
function sell({ quantity, totalCost, held, price, credit, lossRate = 0, profitRate = 0 }) {
    const proceeds = quantity * price;
    const cost = quantity === held ? totalCost : totalCost * quantity / held;
    const loss = price * held < totalCost;
    const fee = floorRate(proceeds, loss ? 2000000 : 10000000) * BigInt(CREDIT[credit].fee) / 100000000n;
    const pnl = proceeds - cost;
    const effect = floorRate(pnl < 0n ? -pnl : pnl, pnl < 0n ? lossRate : profitRate);
    return { cost, fee, effect, proceeds, realized: pnl - fee + effect, payout: proceeds - fee + effect };
}
function gamble(game, bet, result, choice) {
    let rate;
    if (game === 'oddeven') rate = (result[0] % 2 === 1 ? 'odd' : 'even') === choice ? 2000000 : -2000000;
    else {
        const counts = result.reduce((a, n) => { a[n] = (a[n] || 0) + 1; return a; }, {});
        rate = counts[7] === 3 ? 20000000 : counts[7] === 2 ? 4000000 : Object.values(counts).includes(3) ? 5000000 : Object.values(counts).includes(2) ? 3000000 : -100000000;
    }
    return gamblingSettlement(floorRate(bet, rate));
}
function gamblingSettlement(gross) { const tax=gross>0n?floorRate(gross,10000000):0n;return {gross,tax,net:gross-tax}; }
const PRICE_RANGES = { normal: [-300,300], '매우 긍정': [200,600], '긍정': [-100,400], '부정': [-400,100], '매우 부정': [-600,-200] };
function nextPrice(price, sentiment, roll) { const [min,max] = PRICE_RANGES[sentiment || 'normal']; const bps = min + Math.floor(roll * (max-min+1)); const result = BigInt(price) * BigInt(10000+bps) / 10000n; return result < 1n ? 1n : result; }
module.exports = { dropChance, hackerSucceeds, gamblingSettlement, CREDIT, loanLimit, termRate, depositValue, debtValue, GRADES, BONUS, UPGRADE, upgradeCost, upgradeResult, acquisitionGrade, itemRate, sell, gamble, PRICE_RANGES, nextPrice };
