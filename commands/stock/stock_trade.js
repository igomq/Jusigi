const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
const labels=require('../../data/stock_labels.json').labels;
const data=new SlashCommandBuilder().setName('거래').setDescription('주식을 매수하거나 매도합니다.');
for(const name of ['매수','매도'])data.addSubcommand(s=>s.setName(name).setDescription(name+' 거래').addStringOption(o=>o.setName('종목').setDescription('종목').setRequired(true).addChoices(...labels.map(v=>({name:v,value:v})))).addStringOption(o=>o.setName('수량').setDescription('정수 수량 또는 올인').setRequired(true)));
module.exports={data,command:(c,i)=>execute(c,i,'trade',{side:i.options.getSubcommand()==='매수'?'buy':'sell',symbol:i.options.getString('종목'),quantity:i.options.getString('수량')})};
