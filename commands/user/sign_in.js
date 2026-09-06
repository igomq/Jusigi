const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('가입').setDescription('주시기 봇에 가입합니다.'),command:(c,i)=>execute(c,i,'signup')};
