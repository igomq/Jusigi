const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('신용등급').setDescription('신용등급을 확인하거나 상승을 요청합니다.').addSubcommand(s=>s.setName('상승요청').setDescription('상승 조건을 검토합니다.')).addSubcommand(s=>s.setName('혜택').setDescription('현재 혜택과 제한을 확인합니다.')),command:(c,i)=>execute(c,i,i.options.getSubcommand()==='상승요청'?'upgradeCredit':'creditInfo')};
