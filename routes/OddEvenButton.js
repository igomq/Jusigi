const wait = require('node:timers/promises').setTimeout

const User = require('../models/User')
const {MessageFlags} = require("discord-api-types/v10");

module.exports.command = async (client, interaction, data) => {
    const user = await User.GetUser(data.userId);
    const casino = await require('../models/Casino').GetUser(data.userId);
    const originInteraction = activities.get(`OE-${data.userId}`)
    activities.delete(`OE-${data.userId}`);

    const oddOrEven = (Math.floor(Math.random() * 2)) === 0 ? '홀' : '짝'
    const result = oddOrEven === data.action;

    if (data.action === '놉') {
        await originInteraction.deleteReply();
        return await reply(interaction, { content: `${interaction.user} <- 에겐남` })
    }

    const betting = data.etc[0]

    await interaction.deferReply()
    await wait(500);

    await originInteraction.deleteReply();
    let content = '';
    if (result) {
        content = `:tada: ${commaByThree(betting)}<:jusigi_coin:1136308344999653427>의 1.2배인 ${commaByThree(Math.floor(betting * 1.2))}<:jusigi_coin:1136308344999653427>를 획득했습니다!`
        user.purse += Math.floor(betting * 1.2);
    } else {
        content = `:sob: ${commaByThree(betting)}<:jusigi_coin:1136308344999653427>를 잃었습니다. 다음에 다시 도전해보세요!`
        user.purse -= betting;
    }
    const res = casino.makeGame('홀짝', betting, result ? Math.floor(betting * 1.2) : -betting);

    if (res !== 0) {
        await interaction.editReply({
            content: `신용 등급으로 인해 베팅 금액이 ${commaByThree(res)}<:jusigi_coin:1136308344999653427>으로 제한되어 있습니다.`
        });
        return;
    }
    await interaction.editReply({
        content: `${interaction.user}님이 ${oddOrEven}을 선택했습니다.\n${content}`,
        flags: MessageFlags.SuppressEmbeds
    });

    await user.apply();
    await casino.apply();
}
module.exports.name = 'OddEvenButton';