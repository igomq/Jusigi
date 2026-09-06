const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('기억게임').setDescription('다섯 자리를 기억하고 7,000시기와 아이템에 도전합니다.'),command:(c,i)=>execute(c,i,'minigameStart',{game:'memory'})};
