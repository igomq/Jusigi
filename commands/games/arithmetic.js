const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('계산게임').setDescription('베팅 없이 계산 문제를 풀고 5,000시기와 아이템에 도전합니다.'),command:(c,i)=>execute(c,i,'minigameStart',{game:'arithmetic'})};
