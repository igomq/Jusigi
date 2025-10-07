const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, EmbedBuilder} = require('discord.js');
const { query } = require("../../util/query_db");
const {MessageFlags, ButtonStyle} = require("discord-api-types/v10");
const data = new SlashCommandBuilder()
    .setName('다섯고개')
    .setDescription('다섯고개 게임을 시작합니다. 1~500 사이의 숫자를 맞추면 됩니다.')
    .addIntegerOption(option =>
        option.setName("금액")
            .setDescription("베팅할 금액을 입력하세요.")
            .setRequired(true)
    );

const User = require('../../models/User');

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id))
        return await replyEphemeral(interaction, { content: '먼저 `/가입` 명령어로 가입해주세요.' });

    const betting = interaction.options.getInteger("금액");

    const userData = await User.GetUser(user.id);

    if (gameInfo[`FA-${user.id}`]) return await replyEphemeral(interaction, { content: '이미 진행중인 베팅이 있습니다.' });

    if (betting <= 0) return await replyEphemeral(interaction, { content: '0보다 큰 올바른 금액을 입력해 주세요.' });
    else if (betting < 100000) return await replyEphemeral(interaction, { content: '최소 100,000<:jusigi_coin:1136308344999653427>를 베팅해야 합니다.' });
    else if (betting > userData.purse) return await replyEphemeral(interaction, { content: '보유 자산보다 더 베팅할 수 없습니다.' });

    const buttonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({
                    name: 'FiveAskButton',
                    userId: user.id,
                    action: '입력',
                    etc: [betting]
                }))
                .setLabel('입력하기')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(JSON.stringify({name: 'FiveAskButton', userId: user.id, action: '놉'}))
                .setLabel('안할래요')
                .setStyle(ButtonStyle.Danger)
        )

    const Embed = new EmbedBuilder()
        .setAuthor({name: user.tag, iconURL: user.displayAvatarURL()})
        .setDescription('"입력하기" 버튼을 눌러 1~500 사이의 숫자를 입력하세요!')
        .setColor('#ff7f00')
        .addFields(
            { name: '정보', value: `\n베팅 금액: ${commaByThree(betting)}시기`, inline: true },
            { name: '\u200b', value: `성공 시: ${commaByThree(betting * 10)}시기`, inline: true }
        )

    await reply(interaction, {
        embeds: [Embed],
        components: [buttonRow]
    })

    activities.set(`FA-${user.id}`, interaction);
}
module.exports.commandName = '다섯고개';