const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, Collection } = require('discord.js');
const data = new SlashCommandBuilder()
    .setName('파산신청')
    .setDescription('파산을 신청합니다.');

const User = require('../../models/User')
const {MessageFlags, ButtonStyle} = require("discord-api-types/v10");

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id))
        return await interaction.reply({ content: '회원가입이 되어있지 않습니다.', flags: MessageFlags.Ephemeral })

    const newUser = await User.GetUser(user.id);

    const Embed = new EmbedBuilder()
        .setTitle('파산신청')
        .setDescription('파산신청 시, 신용등급은 3등급으로 재조정되고 잔액은 7만시기로 재조정되며, 기존 모든 이력은 말소됩니다.\n진행하시면 되돌릴 수 없습니다. 하시겠습니까?')
        .setColor('#ff0000')

    const ButtonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({
                    userId: user.id,
                    name: 'BankruptButton',
                    action: true
                }))
                .setLabel('파산신청 진행')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(JSON.stringify({
                    userId: user.id,
                    name: 'BankruptButton',
                    action: false
                }))
                .setLabel('파산신청 취소')
                .setStyle(ButtonStyle.Secondary)
        )

    activities.set(`BK-${user.id}`, interaction);

    await replyEphemeral(interaction, { embeds: [Embed], components: [ButtonRow] })
}
module.exports.commandName = '파산신청'