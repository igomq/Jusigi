const { ActivityType } = require('discord.js')
module.exports = (client) => {
    client.on('ready', async () => {
        if (!client.user || !client.application) return;

        console.log(`${client.user.username} 주식봇 테스트 빌드`)
        client.user.setActivity(`주시기 [ ${require('../package.json').version} ]`, { type: ActivityType.Watching })
    })
}