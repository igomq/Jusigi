const {ModalBuilder,TextInputBuilder,TextInputStyle,ActionRowBuilder}=require('discord.js');
const {check}=require('../domain/money');
const {execute,respond}=require('../util/command');
async function handle(client,interaction) {
    const [,userId,session,action]=interaction.customId.split(':');
    check(userId===interaction.user.id,'본인의 버튼만 사용할 수 있습니다.');
    if(interaction.isModalSubmit())return execute(client,interaction,'minigameAnswer',{session,answer:interaction.fields.getTextInputValue('answer')});
    if(action==='hide') {
        await interaction.deferUpdate();
        return respond(interaction,await client.economy.execute(userId,interaction.id,'minigameHide',{session}));
    }
    check(action==='answer','알 수 없는 게임 버튼입니다.');
    return interaction.showModal(new ModalBuilder().setCustomId(`mg:${userId}:${session}:submit`).setTitle('정답 입력').addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('answer').setLabel('정답을 입력하세요. 기회는 한 번입니다.').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5))));
}
module.exports={handle};
