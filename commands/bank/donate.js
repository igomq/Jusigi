const {SlashCommandBuilder}=require('discord.js');
const {execute}=require('../../util/command');
module.exports={data:new SlashCommandBuilder().setName('기부').setDescription('불우이웃을 위해 기부합니다.').addIntegerOption(o=>o.setName('금액').setDescription('기부할 시기').setMinValue(1).setRequired(true)),command:(c,i)=>execute(c,i,'donate',{amount:i.options.getInteger('금액')})};
