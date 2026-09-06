const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('탈퇴').setDescription('계정을 보존하고 탈퇴합니다. 재가입은 신용3 / 7만시기입니다.'),command:(c,i)=>execute(c,i,'withdraw')};
