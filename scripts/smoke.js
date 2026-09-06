const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {getPool,close}=require('../db/pool');
const repo=require('../repositories/economy');
const {Economy}=require('../services/economy');
const {Market}=require('../services/market');
const {connectCache}=require('../services/cache');
async function smoke() {
    const id='99999999999999999'+Date.now();
    const prefix=`smoke-${crypto.randomUUID()}`;let serial=0;
    const economy=new Economy();
    const run=(operation,args={})=>economy.execute(id,`${prefix}-${++serial}`,operation,args);
    let cache;
    try {
        const [tls]=await getPool().query("SHOW SESSION STATUS LIKE 'Ssl_cipher'");
        console.info('MySQL connection ready; TLS:',Boolean(tls[0]?.Value));
        await run('signup');await run('savingsDeposit',{amount:10000});await run('termOpen',{amount:10000,period:1});await run('loan',{amount:10000});
        const key=`${prefix}-dedup`;
        await economy.execute(id,key,'donate',{amount:1000});await economy.execute(id,key,'donate',{amount:1000});
        const persisted=await repo.one(getPool(),'SELECT balance,donations FROM users WHERE id=?',[id]);
        assert.equal(persisted.balance,'89000');assert.equal(persisted.donations,'1000');
        const db=await getPool().getConnection();
        try {await db.beginTransaction();await db.execute('UPDATE users SET balance=1 WHERE id=?',[id]);await db.rollback();}
        finally {db.release();}
        assert.equal((await repo.one(getPool(),'SELECT balance FROM users WHERE id=?',[id])).balance,'89000');
        await run('withdraw');await run('signup');assert.equal((await run('snapshot')).balance,'70000');
        cache=await connectCache();
        if(cache.client?.isReady) {
            const key=`jusigi:smoke:${prefix}`;await cache.set(key,{ok:true},10);assert.deepEqual(await cache.get(key),{ok:true});await cache.client.del(key);
            console.info('Redis TLS set/get/delete PASS');
        } else throw new Error('Redis smoke connection unavailable');
        const market=await new Market({cache}).snapshot();assert.equal(market.stocks.length,8);
        console.info('MySQL committed writes/refetch, idempotency, rollback, withdrawal/rejoin, market persistence PASS');
    } finally {
        const db=await getPool().getConnection();
        try {
            await db.beginTransaction();
            // Only the synthetic account created by this invocation is removed.
            for(const table of ['games','inventory','entitlements','gambling_history','casino_state','stock_trades','holdings','term_deposits','savings','loans','credit_history','economic_events'])await db.execute(`DELETE FROM ${table} WHERE user_id=?`,[id]);
            await db.execute('DELETE FROM users WHERE id=?',[id]);await db.execute('DELETE FROM requests WHERE user_id=?',[id]);await db.commit();
        } catch(error) {await db.rollback();throw error;} finally {db.release();}
        await cache?.close();await close();
    }
}
if(require.main===module)smoke().catch(error=>{console.error('Smoke failed:',error.code||error.name);process.exitCode=1;});
module.exports={smoke};
