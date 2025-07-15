const { SlashCommandBuilder } = require('discord.js');
const { MessageFlags } = require("discord-api-types/v10");
const data = new SlashCommandBuilder()
    .setName('신용등급')
    .setDescription('신용등급과 관련된 명령어들입니다.')
    .addSubcommand(subcommand =>
        subcommand.setName('상승요청')
            .setDescription('신용등급 상승 조건에 맞는 경우, 신용등급 상승을 요청할 수 있습니다.')
    )
    .addSubcommand(subcommand =>
        subcommand.setName('혜택')
            .setDescription('내 신용등급에 따른 혜택 / 패널티를 확인할 수 있습니다.')
    )


module.exports.data = data;
module.exports.commandName = '신용등급';

const User = require('../../models/User');
const Stock = require("../../models/Stock");
const moment = require("moment");
const Bank = require("../../models/Bank");
const Casino = require('../../models/Casino')
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id))
        return await interaction.reply({ content: '사용자 정보가 없습니다. 먼저 `/가입` 명령어를 사용해주세요.', flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    const userdata = await User.GetUser(user.id);
    const userstock = await Stock.GetUser(user.id);
    const casino = await Casino.GetUser(user.id);

    if (subcommand === '상승요청') {
        switch (userdata.credit) {
            case 1:
                return await replyEphemeral(interaction, { content: '이미 최고 신용 등급입니다.' });
            case 2: {
                if (userdata.purse + userstock.sum < 2000000)
                    return await replyEphemeral(interaction, { content: '신용등급 상승을 위해서는 최소 2,000,000<:jusigi_coin:1136308344999653427>의 자산이 필요합니다.' });
                else if (userdata.donation < 500000)
                    return await replyEphemeral(interaction, { content: '신용등급 상승을 위해서는 최소 500,000<:jusigi_coin:1136308344999653427>의 기부가 필요합니다.' });
                else if (moment().diff(userdata.joinedAt, 'days') < 7)
                    return await replyEphemeral(interaction, { content: '가입한 지 최소 일주일이 지나야 1등급 상승 요청을 신청할 수 있습니다.' });

                casino.resetAllProfitLog();
                userdata.credit = 1;
                await reply(interaction, { content: `> 신용등급이 1등급으로 상승하였습니다.\n\n:tada: ${user}님의 신용등급 1등급 달성을 축하합니다!` });
            } break;
            case 3: {
                if (userdata.purse + userstock.sum < 500000)
                    return await replyEphemeral(interaction, { content: '신용등급 상승을 위해서는 최소 500,000<:jusigi_coin:1136308344999653427>의 자산이 필요합니다.' });
                else if (moment().diff(userdata.creditModifiedAt, 'days') < 7)
                    return await replyEphemeral(interaction, { content: '신용등급이 3등급으로 하락한 지 1주일이 지나야 상승요청을 할 수 있습니다.' });
                else if (moment().diff(casino.lastPlayed, 'days') < 7)
                    return await replyEphemeral(interaction, { content: '신용등급 상승을 위해서는 최소 7일간 도박을 하지 않아야 합니다.' });

                casino.resetAllProfitLog();
                userdata.credit = 2;
                await reply(interaction, { content: `> 신용등급이 2등급으로 상승하였습니다.` });
            } break;
            case 4: {
                const userbank = await Bank.GetUser(user.id);

                if (userdata.purse + userstock.sum < 500000)
                    return await replyEphemeral(interaction, { content: '신용등급 상승을 위해서는 최소 500,000<:jusigi_coin:1136308344999653427>의 자산이 필요합니다.' });
                else if (moment().diff(userdata.creditModifiedAt, 'days') < 14)
                    return await replyEphemeral(interaction, { content: '신용등급이 3등급으로 하락한 지 2주일이 지 나야 상승요청을 할 수 있습니다.' });
                else if (userbank.loan.amount > 0)
                    return await replyEphemeral(interaction, { content: '대출이 있는 경우 신용등급 상승 요청을 할 수 없습니다.' });
                else if (moment().diff(casino.lastPlayed, 'days') < 14)
                    return await replyEphemeral(interaction, { content: '신용등급 상승을 위해서는 최소 14일간 도박을 하지 않아야 합니다.' });

                casino.resetAllProfitLog();
                userdata.credit = 3;
                await reply(interaction, { content: `> 신용등급이 3등급으로 상승하였습니다.` });
            } break;
            default: break;
        }
        await casino.apply();
        await userdata.apply();
    } else {
        let creditInfo = '';
        switch (userdata.credit) {
            case 1:
                creditInfo = '>>> - 예금 이자에 부과되는 세금 면제';
                creditInfo += '\n- 주식거래 시 수수료 100% 감면';
                creditInfo += '\n- 미니게임 시 아이템을 획득할 확률이 10%만큼 증가';
                creditInfo += '\n- 아이템 강화 비용 10% 할인';
                break;
            case 2:
                creditInfo = '>>> - 예금 이자에 부과되는 세금 50% 감면';
                creditInfo += '\n- 주식거래 시 수수료 50% 감면';
                creditInfo += '\n- 미니게임 시 아이템을 획득할 확률이 5%만큼 증가';
                break;
            case 3:
                creditInfo = '>>> - 도박 한도 50만<:jusigi_coin:1136308344999653427>로 제한';
                creditInfo += '\n- 아이템 효과 50% 감소';
                break;
            case 4:
                creditInfo = '>>> - 도박 기능 이용 제한';
                creditInfo += '\n- 아이템 강화 제한';
                creditInfo += '\n- 아이템 효과 비활성화';
                break;
            default:
                creditInfo = '알 수 없는 신용 등급입니다.';
        }

        await reply(interaction, { content: `:credit_card: ${user}님의 신용 등급: \`${userdata.credit}\`등급<:credit_rate:1136312933001998488>\n\n${creditInfo}\n\n추가적인 신용거래 정보는 \`/은행 정보\`명령어를 이용해 주세요.` });
    }
}