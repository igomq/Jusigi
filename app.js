const {Client,GatewayIntentBits,Events,ActivityType}=require('discord.js');
const config=require('./config');
const {Economy}=require('./services/economy');
const {Market}=require('./services/market');
const {connectCache}=require('./services/cache');
const {close}=require('./db/pool');
const {loadCommands}=require('./util/registerSlashCommands');
async function main() {
    if(!config.token)throw new Error('TOKEN is required');
    const cache=await connectCache();
    const client=new Client({intents:[GatewayIntentBits.Guilds],allowedMentions:{parse:[]}});
    client.economy=new Economy();client.market=new Market({cache,newsProvider:require('./services/news-provider')()});
    client.routes=await loadCommands();
    require('./manager/RouteManager')(client);
    require('./events/interactionCreate')(client);
    client.once(Events.ClientReady,()=>client.user.setActivity(`주시기 ${require('./package.json').version}`,{type:ActivityType.Watching}));
    let stop=()=>{};
    const shutdown=async()=>{stop();client.destroy();await cache.close();await close();};
    process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);
    try {
        await client.market.snapshot();
        stop=require('./manager/PriceManager')(client.market);
        await client.login(config.token);
    } catch(error) {await shutdown();throw error;}
    return client;
}
if(require.main===module)main().catch(error=>{console.error('Startup failed:',error.code||error.name);process.exitCode=1;});
module.exports={main};
