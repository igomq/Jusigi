const User = require('../models/User')
const {ModalBuilder, TextInputBuilder, ActionRowBuilder} = require("discord.js");
const {TextInputStyle} = require("discord-api-types/v10");

module.exports.command = async (client, interaction, data) => {
    const user = await User.GetUser(data.userId);
    const casino = await require('../models/Casino').GetUser(data.userId);
    const originInteraction = activities.get(`FA-${data.userId}`);
    activities.delete(`FA-${data.userId}`);

    await originInteraction?.deleteReply();
    if (!originInteraction && !gameInfo[`FA-${data.userId}`]) return await reply(interaction, { content: '이미 종료된 게임입니다.' });
    if (data.action === '놉') {
        return await reply(interaction, { content: `${interaction.user} <- 에겐남` });
    } else if (data.action === '노노') {
        // (원금의 * (2/3)^(입력한 횟수)) 만큼만 상환
        const betting = gameInfo[`FA-${data.userId}`]?.betting || 0;
        const remain = gameInfo[`FA-${data.userId}`]?.remain || 0;
        const refund = Math.floor(betting * (2 / 3) ** (5 - remain));

        user.purse -= betting - refund;
        await user.apply();
        delete gameInfo[`FA-${data.userId}`];

        return await reply(interaction, { content: `남은 기회가 ${remain}번 남아있었지만 그만두셨네요. ${commaByThree(refund)}<:jusigi_coin:1136308344999653427>를 상환받았습니다.` });
    }

    console.log(gameInfo);
    if (!gameInfo[`FA-${data.userId}`]) {
        gameInfo[`FA-${data.userId}`] = {
            remain: 5,
            answer: Math.floor(Math.random() * 500) + 1,
            betting: data.etc[0]
        };
    }
    if (gameInfo[`FA-${data.userId}`]?.remain <= 0) {
        return await reply(interaction, { content: '남은 기회가 없습니다. 다 잃었네요!' });
    }

    await interaction.showModal(this.makeModal(data.userId));
    gameInfo[`FA-${data.userId}`].remain--;
}

module.exports.name = 'FiveAskButton';
module.exports.makeModal = (uid) => {
    return new ModalBuilder()
        .setCustomId(JSON.stringify({
            name: 'FiveAskModal',
            userId: uid
        }))
        .setTitle('다섯고개 게임')
        .addComponents(
            new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('FiveAskInput')
                .setLabel('1~500 사이의 숫자를 입력하세요. 더 큰지 작은지 출력됩니다.')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('1~500')
            )
        );
}