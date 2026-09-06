const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('슬롯머신').setDescription('1~7의 숫자 세 개를 뽑습니다.').addIntegerOption(o=>o.setName('금액').setDescription('베팅 금액').setMinValue(1).setRequired(true)),command:(c,i)=>execute(c,i,'gamble',{game:'slots',amount:i.options.getInteger('금액')})};
