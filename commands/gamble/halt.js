const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('중지')
    .setDescription('현재 진행중인 모든 미니게임과 도박을 중지합니다.');

module.exports = {
    data,
    commandName: '중지',
    command(client, interaction) {
        const { execute } = require('../../util/command');
        return execute(client, interaction, 'legacyStop', {});
    }
};
