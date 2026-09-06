const {SlashCommandBuilder,MessageFlags}=require('discord.js');
const {createImage}=require('../../util/createChart');
const labels=require('../../data/stock_labels.json').labels;
module.exports={data:new SlashCommandBuilder().setName('차트').setDescription('주가 이력을 차트로 확인합니다.').addStringOption(o=>o.setName('종목이름').setDescription('종목, 생략하면 전체').addChoices(...labels.map(v=>({name:v,value:v})))),command:async(c,i)=>{
    await i.deferReply({flags:MessageFlags.Ephemeral});const m=await c.market.snapshot(),label=i.options.getString('종목이름');
    const stocks=m.stocks.filter(s=>!label||s.symbol===label);
    const data=stocks.map(s=>({label:s.symbol,color:s.color,data:m.history[s.symbol].map(h=>({x:new Date(h.created_at).getTime(),y:Number(h.price)}))}));
    const buffer=await createImage(labels,data);return i.editReply({files:[{attachment:buffer,name:'chart.png'}]});
}};
