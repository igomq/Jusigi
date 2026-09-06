const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('넌센스')
    .setDescription('넌센스 퀴즈를 시작합니다. 5지선다 형식으로 구성되어 있습니다.')
    .addIntegerOption(option => option
        .setName('금액')
        .setDescription('베팅할 금액을 입력하세요.')
        .setRequired(true));

module.exports = {
    data,
    commandName: '넌센스',
    async command(client, interaction) {
        await interaction.deferReply({flags:64});
        const quiz=await require('../../services/legacy-games').nextQuiz();
        const { execute } = require('../../util/command');
        return execute(client, interaction, 'legacyStart', {
            game: 'nonsense',
            bet: interaction.options.getInteger('금액'), quiz
        });
    }
};
