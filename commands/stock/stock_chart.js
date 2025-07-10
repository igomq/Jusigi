const { SlashCommandBuilder } = require('discord.js');
const { createImage } = require('../../util/createChart');
const { queryStockHistory, queryStockColor } = require('../../util/query_data');

const data = new SlashCommandBuilder()
    .setName('차트')
    .setDescription('모든 종목 또는 특정한 종목의 차트를 확인할 수 있습니다.')
    .addStringOption(option =>
        option.setName('종목이름')
            .setDescription('출력할 중목의 이름을 입력합니다.')
            .setRequired(false));
require('../../data/stock_labels.json').labels
    .forEach(cat => { data.options[0].addChoices({name: cat, value: cat}); })

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    let O = require('../../data/stock_labels.json');
    let D = require('../../data/stock_data.json');
    const label = interaction.options.getString('종목이름');
    const labels = label ? [label] : O.labels;

    const data = [];

    for (const l of labels) {
        data.push({
            label: l,
            data: queryStockHistory(l),
            color: queryStockColor(l)
        })
    }

    const Buff = await createImage(labels, data);
    await interaction.reply({ files: [{ attachment: Buff, name: "chart.png" }] })
}
module.exports.commandName = '차트'