const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('지갑').setDescription('잔액, 주식, 예금, 대출을 확인합니다.'),command:(c,i)=>execute(c,i,'snapshot')};
