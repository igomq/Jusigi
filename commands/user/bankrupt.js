const {SlashCommandBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,MessageFlags}=require('discord.js');
module.exports={data:new SlashCommandBuilder().setName('파산신청').setDescription('신용3 / 7만시기로 개인회생을 신청합니다.'),command:async(c,i)=>{
    const row=new ActionRowBuilder().addComponents(...[true,false].map(action=>new ButtonBuilder().setCustomId(`bk:${i.user.id}:${i.id}:${action?'yes':'no'}`).setLabel(action?'파산신청 진행':'취소').setStyle(action?ButtonStyle.Danger:ButtonStyle.Secondary)));
    await i.reply({content:'예금·주식·대출·도박 이력을 삭제하고 잔액 70,000시기 / 신용3으로 변경합니다. 진행하시겠습니까?',components:[row],flags:MessageFlags.Ephemeral});
}};
