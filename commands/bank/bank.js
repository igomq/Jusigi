const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const { MessageFlags } = require("discord-api-types/v10");
const data = new SlashCommandBuilder()
    .setName('은행')
    .setDescription('여러 가지 은행 업무를 수행합니다.');

// Add subcommands for loan
data.addSubcommand(subcommand =>
    subcommand.setName('대출')
        .setDescription('대출을 신청합니다.')
        .addIntegerOption(option =>
            option.setName('금액')
                .setDescription('대출할 금액을 입력해주세요.')
                .setRequired(true)
        )
);
data.addSubcommand(subcommand =>
    subcommand.setName('상환')
        .setDescription('대출을 상환합니다.')
        .addIntegerOption(option =>
            option.setName('금액')
                .setDescription('상환할 금액을 입력해주세요.')
                .setRequired(true)
        )
);

// Add subcommands for deposit
data.addSubcommand(subcommand =>
    subcommand.setName('예금')
        .setDescription('예금을 신청합니다.')
        .addIntegerOption(option =>
            option.setName('금액')
                .setDescription('예금할 금액을 입력해주세요.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('종류')
                .setDescription('예금 종류를 선택해주세요.')
                .addChoices(
                    { name: '보통예금', value: 'savings' },
                    { name: '정기예금', value: 'deposit' }
                )
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('기간')
                .setDescription('정기예금의 기간을 입력해주세요. (일 단위)')
                .setRequired(false)
        )
);
data.addSubcommand(subcommand =>
    subcommand.setName('인출')
        .setDescription('예금을 인출합니다.')
        .addStringOption(option =>
            option.setName('종류')
                .setDescription('인출할 예금 종류를 선택해주세요.')
                .addChoices(
                    { name: '보통예금', value: 'savings' },
                    { name: '정기예금', value: 'deposit' }
                )
                .setRequired(true)
        )
);
data.addSubcommand(subcommand =>
    subcommand.setName('정보')
        .setDescription('은행 정보를 확인합니다.')
)

module.exports.data = data;
module.exports.commandName = '은행';

const User = require('../../models/User');
const Stock = require("../../models/Stock");

const {GetLoanInterestRateByUserCredit, GetLoanLimitWithCreditAndProperty} = require("./implementation/LoanMethods");
const {GetSavingsInterestRateByUserCredit, GetDepositInterestRateByUserCreditAndDue,
    GetDepositInterestRateLimitByUserCredit
} = require("./implementation/DepositMethods");

module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id))
        return await interaction.reply({ content: '회원가입이 되어있지 않아 실행할 수 없습니다.\n> 재미있는 주시기 봇을 즐기려면 `/가입`명령어로 주시기 봇에 가입하세요!', flags: MessageFlags.Ephemeral });

    const Loan = require('./implementation/LoanAction')
    const Deposit = require('./implementation/DepositAction');

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
        case '대출':
            return await Loan(client, interaction, user);
        case '상환':
            return await Loan(client, interaction, user, true);
        case '예금':
            return await Deposit(client, interaction, user);
        case '인출':
            return await Deposit(client, interaction, user, true);
        default: {
            const userdata = await User.GetUser(user.id);
            const userstock = await Stock.GetUser(user.id);

            const LoanInterestRate = GetLoanInterestRateByUserCredit(userdata.credit);
            const LoanInterestLimit = GetLoanLimitWithCreditAndProperty(userdata.credit, { stock: userstock.sum, purse: userdata.purse });
            const SavingsInterestRate = GetSavingsInterestRateByUserCredit(userdata.credit);
            const DepositInterestRate = GetDepositInterestRateByUserCreditAndDue(userdata.credit, 1);
            const DepositInterestRateMax = GetDepositInterestRateLimitByUserCredit(userdata.credit);

            const Embed = new EmbedBuilder()
                .setColor('#ffb946')
                .setTitle('은행 정보')
                .setDescription('은행 이자율, 한도에 대한 정보를 확인합니다.')
                .addFields(
                    {name: '\u200b', value: '\u200b'},
                    { name: '대출 이자율', value: `${LoanInterestRate}%`, inline: true },
                    { name: '대출 한도', value: `${commaByThree(LoanInterestLimit)}시기`, inline: true },
                    { name: '보통 예금 이자율', value: `${100 * SavingsInterestRate}%` },
                    { name: '정기 예금 이자율', value: `${DepositInterestRate} X (예금일수)²% (최대 ${DepositInterestRateMax}%)` }
                )
                .setFooter({ text: '주시기', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            return await reply(interaction, { embeds: [Embed] });
        }
    }
}