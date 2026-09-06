const test=require('node:test');const assert=require('node:assert/strict');
const {Cache}=require('../services/cache');const {countdown}=require('../services/market');
test('cache miss, corrupted JSON, disconnected or failed Redis all fall back',async()=>{
    assert.equal(await new Cache().get('x'),null);
    const c=new Cache({isReady:true,get:async()=>'{bad',set:async()=>{throw Error('unavailable');}});
    assert.equal(await c.get('x'),null);await c.set('x',{},30);
});
test('countdown uses persisted next tick and six-tick news schedule, reports delay',()=>{
    const state={tick:'5',next_update_at:'2026-01-01T00:05:00Z',interval_ms:300000};
    assert.deepEqual(countdown(state,new Date('2026-01-01T00:04:30Z')),{priceSeconds:30,newsSeconds:30,delayed:false});
    assert.deepEqual(countdown({...state,tick:'6'},new Date('2026-01-01T00:04:30Z')),{priceSeconds:30,newsSeconds:1530,delayed:false});
    assert.equal(countdown(state,new Date('2026-01-01T00:06:00Z')).delayed,true);
});
