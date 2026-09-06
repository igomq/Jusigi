const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('다섯고개')
    .setDescription('다섯고개 게임을 시작합니다. 1~500 사이의 숫자를 맞추면 됩니다.')
    .addIntegerOption(option => option
        .setName('금액')
        .setDescription('베팅할 금액을 입력하세요.')
        .setRequired(true));

module.exports = {
    data,
    commandName: '다섯고개',
    command(client, interaction) {
        const { execute } = require('../../util/command');
        return execute(client, interaction, 'legacyStart', {
            game: 'fiveask',
            bet: interaction.options.getInteger('금액')
        });
    }
};
