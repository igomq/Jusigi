const Moment = require('moment');

const { SlashCommandBuilder } = require('discord.js');
const { queryStockHistory } = require("../../util/query_data");
const data = new SlashCommandBuilder()
    .setName('주가표')
    .setDescription('종목들의 주가 등락 정보를 표 형식으로 확인할 수 있습니다.');

const GetDiffColorString = (diff, cur) => {
    if (cur === 0) return '파산'

    if (diff > 0) return `+`
    else if (diff < 0) return `-`
    else return '•'
}

const GetDiffString = (diff, cur) => {
    if (cur === 0) return 'X'

    if (diff > 0) return `↑`
    else if (diff < 0) return `↓`
    else return '—'
}

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    const O = require('../../data/stock_labels.json');
    const D = require('../../data/stock_data.json').lastUpdate;

    let str = `> 📊 주시기 주식 테이블\n\`\`\`diff\n갱신 시점 : ${Moment(D).format('YYYY-MM-DD a h:mm:ss')} (UTC+9)\n\n`;
    for (const label of O.labels) {
        const history = queryStockHistory(label);
        let diff = ' ' + history.at(-1) - history.at(-2);

        if (history.at(-1) === 0) diff = '';
        str += `${GetDiffColorString(diff, history.at(-1))} ${label} | ${history.at(-1)} (${GetDiffString(diff,history.at(-1))}${diff})\n`
    }

    str += '```';
    const UPDATE_INTERVAL = 60 * 1000;

    const timeSinceLastUpdate = Date.now() - Number(D);
    const timeUntilNextUpdate = UPDATE_INTERVAL - (timeSinceLastUpdate % UPDATE_INTERVAL);

    await interaction.reply(str += `\n다음 갱신까지: \`${(timeUntilNextUpdate / 1000).toFixed(0)}초\``);

}
module.exports.commandName = '주가표'