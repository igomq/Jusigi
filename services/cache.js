const { createClient } = require('redis');
const config = require('../config');
class Cache {
    constructor(client) { this.client=client; }
    async get(key) {try {if(this.client?.isReady) {const value=await this.client.get(key);return value?JSON.parse(value):null;}}catch {} return null;}
    async set(key,value,seconds=30) {try {if(this.client?.isReady) await this.client.set(key,JSON.stringify(value),{EX:seconds});}catch {}}
    async close() { if(this.client?.isOpen) this.client.destroy(); }
}
async function connectCache() {
    if(!config.redis.host) return new Cache();
    const client=createClient({socket:{host:config.redis.host,port:config.redis.port,tls:true,servername:config.redis.host,connectTimeout:3000,reconnectStrategy:false},password:config.redis.password,disableOfflineQueue:true});
    client.on('error',()=>{});
    try {await client.connect();} catch {console.warn('Redis unavailable; using MySQL reads.');}
    return new Cache(client);
}
module.exports={Cache,connectCache};
