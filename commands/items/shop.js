const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('상점').setDescription('판매 목록을 보거나 아이템/퀵패스를 구매합니다.').addStringOption(o=>o.setName('구매').setDescription('아이템명 또는 quick_pass. 생략하면 판매 목록')),command:(c,i)=>{const item=i.options.getString('구매');return execute(c,i,item?'buy':'shop',item?{item}:{});}};
