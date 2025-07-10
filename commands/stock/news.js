const { SlashCommandBuilder } = require('discord.js');

const moment = require('moment');
const {readFileSync} = require("node:fs");
moment.locale('ko')

const data = new SlashCommandBuilder()
    .setName('뉴스')
    .setDescription('최근 6개의 뉴스를 확인할 수 있습니다. 뉴스는 주가 변동에 큰 영향을 미칩니다.')

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    const News = JSON.parse(readFileSync("data/news.json","utf-8"));
    let newsString = '> :newspaper: 최신 뉴스\n\n```md\n';

    for (let news of News) {
        newsString += `# [${news.stock}] ${news.title}\n`
        newsString += `- ${news.summary}\n`
        newsString += `- ${moment(news.createdAt).fromNow()}\n\n`
    }

    newsString += '```';
    await interaction.reply(newsString);
}
module.exports.commandName = '뉴스'