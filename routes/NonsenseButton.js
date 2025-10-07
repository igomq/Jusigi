const User = require("../models/User");
const {ActionRowBuilder, ButtonBuilder} = require("discord.js");

module.exports.command = async (client, interaction, data) => {
    const user = await User.GetUser(data.userId);
    const casino = await require('../models/Casino').GetUser(data.userId);
    const originInteraction = activities.get(`NS-${data.userId}`);

    if (!originInteraction && !gameInfo[`NS-${data.userId}`]) return await reply(interaction, { content: '이미 종료된 게임입니다.' });
    if (data.action === 'stop') {
        await originInteraction?.deleteReply();
        activities.delete(`NS-${data.userId}`);

        const betting = gameInfo[`NS-${data.userId}`]?.betting || 0;
        const usedHints = gameInfo[`NS-${data.userId}`]?.usedHints || 0;
        const refund = Math.floor(betting * (3 - usedHints) / 3);

        user.purse -= betting - refund;
        await user.apply();
        delete gameInfo[`NS-${data.userId}`];

        return await reply(interaction, { content: `넌센스 퀴즈를 포기하셨습니다.\n${commaByThree(refund)}<:jusigi_coin:1136308344999653427>를 상환받았습니다.` });
    }
    else if (data.action === 'hint') {
        const hints = gameInfo[`NS-${data.userId}`]?.hints || [];
        const usedHints = gameInfo[`NS-${data.userId}`]?.usedHints || 0;

        gameInfo[`NS-${data.userId}`].usedHints++;

        if (usedHints === 1) {
            try {
                const updatedComponents = interaction.message.components.map(row => {
                    return ActionRowBuilder.from(row).setComponents(
                        row.components.map(comp => {
                            if (comp.customId === JSON.stringify({name: 'NonsenseButton', userId: data.userId, action: 'hint'})) {
                                return ButtonBuilder.from(comp).setDisabled(true);
                            }
                            return comp;
                        })
                    );
                });
                await originInteraction.editReply({ components: updatedComponents });
            } catch (error) {
                console.error('메시지 업데이트 실패:', error);
            }
        }
        return await replyEphemeral(interaction, { content: `[힌트 ${usedHints + 1}]\n> ${hints[usedHints]}`});
    }
    else {
        const answerIndex = gameInfo[`NS-${data.userId}`]?.answerIndex;
        const betting = gameInfo[`NS-${data.userId}`]?.betting || 0;
        const usedHints = gameInfo[`NS-${data.userId}`]?.usedHints || 0;

        const Comment = gameInfo[`NS-${data.userId}`]?.comment;
        if (parseInt(data.action) === answerIndex + 1) {
            const profit = Math.floor(betting * [5 / 6, 2 / 3, 1 / 2][usedHints]) || 0;
            user.purse += profit;
            await user.apply();

            casino.makeGame('넌센스', betting, betting);
            await casino.apply();

            await originInteraction?.deleteReply();
            activities.delete(`NS-${data.userId}`);
            delete gameInfo[`NS-${data.userId}`];

            return await reply(interaction, { content: `정답입니다! 축하드립니다!\n${commaByThree(betting + profit)}<:jusigi_coin:1136308344999653427>를 획득하셨습니다!\n\n> 해설: ${Comment}` });
        } else {
            user.purse -= betting;
            await user.apply();

            casino.makeGame('넌센스', betting, -betting);
            await casino.apply();

            await originInteraction?.deleteReply();
            activities.delete(`NS-${data.userId}`);
            delete gameInfo[`NS-${data.userId}`];

            return await reply(interaction, { content: `틀렸습니다! 아쉽네요!\n${commaByThree(betting)}<:jusigi_coin:1136308344999653427>를 잃으셨습니다.\n\n> 정답: ${answerIndex + 1}번\n> 해설: ${Comment}` });
        }
    }
}

module.exports.name = 'NonsenseButton';