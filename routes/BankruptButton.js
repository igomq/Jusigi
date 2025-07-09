const {query} = require("../util/query_db");
module.exports.command = async (client, interaction, data) => {
    const originInteraction = await require('../commands/user/bankrupt').activities.get(data.userId);

    if (!data.action) {
        await originInteraction.deleteReply();
        return await interaction.reply({ content: '파산 신청이 취소되었습니다.', flags: 64 });
    }

    const User = require('../models/User');
    const user = await User.GetUser(data.userId);

    user.credit = 3;
    user.purse = 70000;

    await user.apply();

    await query(`DELETE FROM stock WHERE id = ${data.userId}`);
    await query(`DELETE FROM bank WHERE id = ${data.userId}`);
    await query(`DELETE FROM deposit WHERE id = ${data.userId}`);

    await originInteraction.deleteReply();
    return await interaction.reply({
        content: `${interaction.user}님의 파산 신청이 완료되었습니다.\n신용 등급은 3등급으로 재조정되었으며, 잔액은 7만시기로 재조정되었습니다. 기존 모든 이력은 말소되었습니다.`,
        flags: 64
    });
}
module.exports.name = 'BankruptButton';