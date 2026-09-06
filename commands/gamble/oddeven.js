const {SlashCommandBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,MessageFlags}=require('discord.js');
module.exports={data:new SlashCommandBuilder().setName('홀짝').setDescription('성공 시 2% 이익, 실패 시 2% 손실').addIntegerOption(o=>o.setName('금액').setDescription('베팅 금액').setMinValue(1).setRequired(true)),command:async(c,i)=>{
    const amount=i.options.getInteger('금액');
    const row=new ActionRowBuilder().addComponents(...['odd','even','cancel'].map(choice=>new ButtonBuilder().setCustomId(`oe:${i.user.id}:${i.id}:${amount}:${choice}`).setLabel({odd:'홀',even:'짝',cancel:'취소'}[choice]).setStyle(choice==='cancel'?ButtonStyle.Secondary:ButtonStyle.Primary)));
    await i.reply({content:`${amount.toLocaleString('ko-KR')}시기 베팅 · 이익세 10% · 게임별 1시간 쿨타임(퀵패스 10분)`,components:[row],flags:MessageFlags.Ephemeral});
}};
