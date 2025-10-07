const User = require("../models/User");
const Casino = require("../models/Casino");
const {ActionRowBuilder, ButtonBuilder} = require("discord.js");
const {ButtonStyle} = require("discord-api-types/v10");
module.exports.command = async (client, interaction, data) => {
    const user = await User.GetUser(data.userId);
    const casino = await Casino.GetUser(data.userId);

    const response = interaction.fields.getTextInputValue('FiveAskInput');
    if (!response || isNaN(parseInt(response)) || response < 1 || response > 500) {
        return await interaction.reply({ content: '1~500 사이의 숫자를 입력해주세요.', ephemeral: true });
    }

    const buttonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({
                    name: 'FiveAskButton',
                    userId: user.id,
                    action: '입력'
                }))
                .setLabel('계속 진행')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(JSON.stringify({name: 'FiveAskButton', userId: user.id, action: '노노'}))
                .setLabel('그만할래요')
                .setStyle(ButtonStyle.Danger)
        )

    const answer = gameInfo[`FA-${data.userId}`].answer;
    if (response > answer)
        return await interaction.reply({ content: `${response}보다 작습니다!`, ephemeral: true, components: [buttonRow] });
    else if (response < answer)
        return await interaction.reply({ content: `${response}보다 큽니다!`, ephemeral: true, components: [buttonRow] });
    else {
        const betting = gameInfo[`FA-${data.userId}`].betting;
        user.purse += betting * 9;
        await user.apply();
        casino.makeGame('다섯고개', betting, betting * 9);
        await casino.apply();
        delete gameInfo[`FA-${data.userId}`];

        return await interaction.reply({
            content: `정답입니다! 축하드려요! ${commaByThree(betting * 10)}<:jusigi_coin:1136308344999653427>를 획득했습니다!`
        });
    }
}
module.exports.name = 'FiveAskModal';