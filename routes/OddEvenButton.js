const wait = require('node:timers/promises').setTimeout

const User = require('../models/User')

module.exports.command = async (client, interaction, data) => {
    const user = await User.GetUser(data.userId);
    const originInteraction = activities.get(`OE-${data.userId}`)

    const oddOrEven = (Math.floor(Math.random() * 2)) === 0 ? '홀' : '짝'
    const result = oddOrEven === data.action;

    if (data.action === '놉') {
        await originInteraction.deleteReply();
        return reply(interaction, { content: `${interaction.user} <- 에겐남` })
    }

    const betting = data.etc[0]

    await interaction.deferReply()
    await wait(500);

    await originInteraction.deleteReply();
    if (result) {
        await interaction.editReply({
            content: `:tada: ${commaByThree(betting)}<:jusigi_coin:1136308344999653427>의 1.2배인 ${commaByThree(Math.floor(betting * 1.2))}<:jusigi_coin:1136308344999653427>를 획득했습니다!`
        })
        user.purse += Math.floor(betting * 1.2);
    } else {
        await interaction.editReply({
            content: `:sob: ${commaByThree(betting)}<:jusigi_coin:1136308344999653427>를 잃었습니다. 다음에 다시 도전해보세요!`
        })
        user.purse -= betting;
    }
    await user.apply();
}
module.exports.name = 'OddEvenButton';