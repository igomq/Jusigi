const { SlashCommandBuilder } = require('discord.js');
const { MessageFlags } = require("discord-api-types/v10");
const data = new SlashCommandBuilder()
    .setName('기부')
    .setDescription('불우이웃을 위해 기부합니다.')
    .addIntegerOption(option =>
        option.setName('금액')
            .setDescription('기부할 금액을 입력해주세요.')
            .setRequired(true)
    );


module.exports.data = data;
module.exports.commandName = '기부';

const User = require('../../models/User');
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id))
        return interaction.reply({ content: '사용자 정보가 없습니다. 먼저 `/가입` 명령어를 사용해주세요.', flags: MessageFlags.Ephemeral });

    const amount = interaction.options.getInteger('금액');
    if (amount <= 0)
        return replyEphemeral(interaction, { content: '기부 금액은 0보다 커야 합니다.' });
    if (user.purse < amount)
        return replyEphemeral(interaction, { content: '기부 금액이 보유 금액보다 큽니다.' });

    // 기부 처리
    const userdata = await User.GetUser(user.id);
    userdata.purse -= amount;
    await userdata.apply();

    return reply(interaction, { content: `기부가 완료되었습니다. 기부 금액: ${commaByThree(amount)}원` });
}