const { transaction, close } = require('./pool');
const config = require('../config');
const definitions = require('../data/stocks.json');
async function seed() {
    await transaction(async db => {
        const now = new Date();
        for (const stock of definitions) {
            await db.execute('INSERT IGNORE INTO stock_definitions(symbol,color,initial_price) VALUES (?,?,?)', [stock.symbol,stock.color,stock.initialPrice]);
            await db.execute('INSERT IGNORE INTO stock_prices(symbol,price,updated_at) VALUES (?,?,?)', [stock.symbol,stock.initialPrice,now]);
            await db.execute('INSERT IGNORE INTO stock_history(symbol,tick,price,created_at) VALUES (?,0,?,?)', [stock.symbol,stock.initialPrice,now]);
        }
        await db.execute('INSERT IGNORE INTO market_state(id,last_update_at,next_update_at,interval_ms) VALUES (1,?,?,?)', [now,new Date(+now+config.interval),config.interval]);
        for (const item of require('../data/items.json')) {
            await db.execute('INSERT IGNORE INTO item_definitions(id,name,type,effect,base_rate,price,released) VALUES (?,?,?,?,?,?,TRUE)', [item.id,item.name,item.type,item.effect,item.baseRate,item.price]);
        }
    });
}
if (require.main === module) seed().then(() => console.info('Seed complete (existing economy preserved)')).catch(e => { console.error('Seed failed:',e.code || e.name); process.exitCode=1; }).finally(close);
module.exports = { seed };
