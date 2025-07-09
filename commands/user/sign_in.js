const { SlashCommandBuilder } = require('discord.js');
const data = new SlashCommandBuilder()
    .setName('가입')
    .setDescription('주시기 봇에 가입합니다.');

const User = require('../../models/User')
const { MessageFlags } = require("discord-api-types/v10");

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    if (await User.isUserExists(user.id))
        return await interaction.reply({ content: '이미 가입되어 있습니다!', flags: MessageFlags.Ephemeral })

    const newUser = await User.GetUser(user.id);

    const { EmbedBuilder } = require('discord.js')
    const embed = new EmbedBuilder()
        .setTitle('주시기 회원가입')
        .setDescription('가입이 완료되었습니다!')
        .setColor('#00ff00')
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
}
module.exports.commandName = '가입'