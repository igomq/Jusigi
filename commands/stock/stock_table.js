const {SlashCommandBuilder,MessageFlags}=require('discord.js');
const {respond,money}=require('../../util/command');
const {countdown}=require('../../services/market');
module.exports={data:new SlashCommandBuilder().setName('주가표').setDescription('현재 주가와 등락을 확인합니다.'),command:async(c,i)=>{
    await i.deferReply({flags:MessageFlags.Ephemeral});const m=await c.market.snapshot();
    return respond(i,m.stocks.map(s=>{const h=m.history[s.symbol],diff=BigInt(s.price)-BigInt(h.at(-2)?.price||s.price);return `${s.symbol}: ${money(s.price)} (${diff>0n?'+':''}${diff})`;}).join('\n')+`\n갱신: ${m.state.last_update_at}\n다음 갱신: ${countdown(m.state).priceSeconds}초`);
}};
