const { SlashCommandBuilder } = require('discord.js');
const { query } = require("../../util/query_db");
const {MessageFlags} = require("discord-api-types/v10");
const data = new SlashCommandBuilder()
    .setName('중지')
    .setDescription('현재 진행중인 모든 미니게임, 도박의 진행을 중지합니다. (다인 게임은 제외)');

const User = require('../../models/User');

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    const ActiveActivities = activities.filter(activity => activity.user.id === interaction.user.id);
    const ActiveGames = Object.keys(gameInfo).reduce((res, key) => {
        if (key.endsWith(`-${interaction.user.id}`)) res.push(key);
        return res;
    })

    if (ActiveActivities.size === 0) return await replyEphemeral(interaction, { content: '진행중인 게임이 없습니다.' });

    const activityNames = ActiveActivities.map((value, key, collection) => key);
    activityNames.forEach(name => activities.delete(name));
    ActiveGames.forEach(name => delete gameInfo[name]);

    await replyEphemeral(interaction, { content: `진행중인 게임을 모두 중지했습니다.` });
}
module.exports.commandName = '중지';