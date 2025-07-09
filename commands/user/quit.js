const { SlashCommandBuilder } = require('discord.js');
const { query } = require("../../util/query_db");
const {MessageFlags} = require("discord-api-types/v10");
const data = new SlashCommandBuilder()
    .setName('탈퇴')
    .setDescription('주시기 봇에서 탈퇴합니다.');

const User = require('../../models/User');

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id)) return await interaction.reply({ content: '회원가입이 되어있지 않아 탈퇴할 수 없습니다.\n> 재미있는 주시기 봇을 즐기려면 `/가입`명령어로 주시기 봇에 가입하세요!', flags: MessageFlags.Ephemeral });

    await query(`DELETE FROM stock WHERE id = ${user.id}`);
    await query(`DELETE FROM bank WHERE id = ${user.id}`);
    await query(`DELETE FROM user WHERE id = ${user.id}`);
    await query(`DELETE FROM deposit WHERE id = ${user.id}`);
    await interaction.reply({ content: '탈퇴가 완료되었습니다!', flags: MessageFlags.Ephemeral })
}
module.exports.commandName = '탈퇴'