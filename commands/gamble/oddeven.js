const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, Collection } = require('discord.js');
const data = new SlashCommandBuilder()
    .setName('홀짝')
    .setDescription('홀짝 도박을 시작합니다.')
    .addIntegerOption(option => 
        option.setName("금액")
        .setDescription("베팅할 금액을 입력하세요.")
        .setRequired(true)
    )

const User = require('../../models/User')
const Casino = require('../../models/Casino');
const { MessageFlags, ButtonStyle} = require("discord-api-types/v10");

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id)) return replyEphemeral(interaction, '먼저 `/가입` 명령어로 가입해주세요.');
    if (activities.get(`OE-${user.id}`)) return replyEphemeral(interaction, '이미 진행중인 베팅이 있습니다.');
    
    const amount = interaction.options.getInteger("금액");
    
    const userData = await User.GetUser(user.id);
    const casino = await Casino.GetUser(user.id);

    // const thisGame = casino.casino['홀짝'].played

    if (amount <= 0) return replyEphemeral(interaction, '0보다 큰 올바른 금액을 입력해 주세요.');
    else if (amount < 100000) return replyEphemeral(interaction, '최소 100,000<:jusigi_coin:1136308344999653427>를 베팅해야 합니다.');
    else if (amount > userData.purse) return replyEphemeral(interaction, '보유 자산보다 더 베팅할 수 없습니다.');

    const buttonRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({
                    name: 'OddEvenButton',
                    userId: user.id,
                    action: '홀',
                    etc: [amount]
                }))
                .setLabel('홀')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(JSON.stringify({
                    name: 'OddEvenButton',
                    userId: user.id,
                    action: '짝',
                    etc: [amount]
                }))
                .setLabel('짝')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(JSON.stringify({name: 'OddEvenButton', userId: user.id, action: '놉'}))
                .setLabel('안할래요')
                .setStyle(ButtonStyle.Danger)
        )

    const Embed = new EmbedBuilder()
        .setAuthor({name: user.tag, iconURL: user.displayAvatarURL()})
        .setDescription('홀과 짝을 선택해주세요! 성공시 베팅 금액의 20%가 지급됩니다.')
        .setColor('#ff7f00')
        .addFields(
            { name: '정보', value: `\n베팅 금액: ${commaByThree(amount)}`, inline: true },
            { name: '\u200b', value: `${commaByThree(Math.floor(amount * 1.2))}`, inline: true }
        )

    await reply(interaction, { embeds: [Embed], components: [buttonRow] });

    activities.set(`OE-${user.id}`, interaction);
}
module.exports.commandName = '홀짝'