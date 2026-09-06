const {SlashCommandBuilder,MessageFlags}=require('discord.js');
const {respond}=require('../../util/command');
const {countdown}=require('../../services/market');
module.exports={data:new SlashCommandBuilder().setName('뉴스').setDescription('최근 6개 뉴스와 실제 갱신 예정 시간을 확인합니다.'),command:async(c,i)=>{
    await i.deferReply({flags:MessageFlags.Ephemeral});const market=await c.market.snapshot(),time=countdown(market.state);
    const news=market.news.map(n=>`[${n.symbol} · ${n.sentiment}] ${n.title}\n${n.summary}\n${n.created_at}`).join('\n\n');
    return respond(i,`${news||'아직 발표된 뉴스가 없습니다.'}\n\n다음 주가 갱신: ${time.priceSeconds}초 · 다음 뉴스: ${time.newsSeconds}초${time.delayed?' (갱신 지연 중)':''}`);
}};
