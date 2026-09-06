const SCALE = 100000000n;
const DAY = 86400000;
const MAX = 9223372036854775807n;
class DomainError extends Error {}
function check(condition, message) { if (!condition) throw new DomainError(message); }
function integer(value, { zero = false } = {}) {
    check(typeof value === 'bigint' || (typeof value === 'number' && Number.isSafeInteger(value)) || (typeof value === 'string' && /^\d+$/.test(value)), '정수를 입력해주세요.');
    const n = BigInt(value);
    check(n >= (zero ? 0n : 1n) && n <= MAX, '금액/수량 범위를 확인해주세요.');
    return n;
}
const floorRate = (amount, rate) => BigInt(amount) * BigInt(rate) / SCALE;
const days = (start, now) => Math.max(0, Math.floor((new Date(now) - new Date(start)) / DAY));
function compound(amount, rate, count) {
    // Daily capitalization is rounded once per complete day; all callers use this convention.
    let value = BigInt(amount);
    for (let i = 0; i < count; i++) { value += floorRate(value, rate); check(value <= MAX, '이자 계산이 저장 범위를 초과했습니다.'); }
    return value;
}
const json = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v);
module.exports = { SCALE, DAY, MAX, DomainError, check, integer, floorRate, days, compound, json };
