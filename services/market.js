const { transaction,getPool } = require('../db/pool');
const repo = require('../repositories/economy');
const { nextPrice,PRICE_RANGES } = require('../domain/rules');
const { json,check } = require('../domain/money');
const config = require('../config');
const { randomInt } = require('node:crypto');
const { Cache } = require('./cache');
const sentiments=Object.keys(PRICE_RANGES).filter(s=>s!=='normal');
class Market {
    constructor({cache=new Cache(),transact=transaction,db=getPool,clock=()=>new Date(),random=()=>randomInt(100000000)/100000000,newsProvider=null}={}) {Object.assign(this,{cache,transact,db,clock,random,newsProvider});}
    async snapshot() {
        const state=await repo.one(this.db(),'SELECT * FROM market_state WHERE id=1');check(state,'DB 초기화가 필요합니다.');
        // Versioned keys make an old in-flight cache fill harmless after a committed tick.
        const key=`jusigi:${config.db.database}:market:${state.tick}`;
        const cached=await this.cache.get(key);if(cached)return cached;
        const value=await this.transact(async db=>{
            const current=await repo.one(db,'SELECT * FROM market_state WHERE id=1 FOR SHARE');
            const stocks=await repo.rows(db,'SELECT p.*,d.color FROM stock_prices p JOIN stock_definitions d ON d.symbol=p.symbol ORDER BY p.symbol');
            const news=await repo.rows(db,'SELECT * FROM news ORDER BY tick DESC LIMIT 6');
            const history={};
            for(const stock of stocks) history[stock.symbol]=(await repo.rows(db,'SELECT price,created_at,tick FROM stock_history WHERE symbol=? ORDER BY tick DESC LIMIT 250',[stock.symbol])).reverse();
            return JSON.parse(json({state:current,stocks,news,history}));
        });
        await this.cache.set(`jusigi:${config.db.database}:market:${value.state.tick}`,value);
        return value;
    }
    async tick() {
        const before=await repo.one(this.db(),'SELECT * FROM market_state WHERE id=1');
        if(!before||+new Date(before.next_update_at)>+this.clock())return false;
        let article=null;
        if((BigInt(before.tick)+1n)%6n===0n && this.newsProvider) {try {article=await this.newsProvider();}catch {}}
        return this.transact(async db=>{
            const state=await repo.one(db,'SELECT * FROM market_state WHERE id=1 FOR UPDATE');const now=this.clock();
            if(+new Date(state.next_update_at)>+now)return false;
            const tick=BigInt(state.tick)+1n;
            const stocks=await repo.rows(db,'SELECT * FROM stock_prices ORDER BY symbol FOR UPDATE');
            let news=state.news_id?await repo.one(db,'SELECT * FROM news WHERE id=?',[state.news_id]):null;
            if(tick%6n===0n) {
                const stock=stocks[Math.floor(this.random()*stocks.length)],sentiment=sentiments[Math.floor(this.random()*4)];
                const title=typeof article?.title==='string'?article.title.slice(0,200):`${stock.symbol} 시장 소식: ${sentiment}`;
                const summary=typeof article?.summary==='string'?article.summary.slice(0,1000):`${stock.symbol}에 ${sentiment} 전망이 발표되었습니다. (게임 내 가상 뉴스)`;
                const result=await repo.rows(db,'INSERT INTO news(symbol,sentiment,title,summary,tick,created_at) VALUES (?,?,?,?,?,?)',[stock.symbol,sentiment,title,summary,tick.toString(),now]);
                news={id:result.insertId,symbol:stock.symbol,sentiment};
            }
            for(const stock of stocks) {
                const price=nextPrice(stock.price,news?.symbol===stock.symbol?news.sentiment:null,this.random());
                await repo.rows(db,'UPDATE stock_prices SET price=?,updated_at=? WHERE symbol=?',[price.toString(),now,stock.symbol]);
                await repo.rows(db,'INSERT INTO stock_history(symbol,tick,price,created_at) VALUES (?,?,?,?)',[stock.symbol,tick.toString(),price.toString(),now]);
            }
            await repo.rows(db,'UPDATE market_state SET tick=?,last_update_at=?,next_update_at=?,interval_ms=?,news_id=? WHERE id=1',[tick.toString(),now,new Date(+now+config.interval),config.interval,news?.id||null]);
            return true;
        });
    }
}
function countdown(state,now=new Date()) {
    const priceMs=Math.max(0,+new Date(state.next_update_at)-+now);
    const ticks=6-Number(BigInt(state.tick)%6n);
    return {priceSeconds:Math.ceil(priceMs/1000),newsSeconds:Math.ceil((priceMs+(ticks-1)*state.interval_ms)/1000),delayed:+new Date(state.next_update_at)<+now};
}
module.exports={Market,countdown};
