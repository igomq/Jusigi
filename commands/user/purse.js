const moment = require('moment');

const { SlashCommandBuilder } = require('discord.js');
const { MessageFlags } = require("discord-api-types/v10");
const data = new SlashCommandBuilder()
    .setName('지갑')
    .setDescription('보유중인 주식, 돈을 보여줍니다.');

const User = require('../../models/User')
const Stock = require('../../models/Stock');
const Bank = require('../../models/Bank');
const Deposit = require("../../models/Deposit");

const STOCK_LIST = [
    "곰큐항공", "빅제제약", "파랑전자",
    "신규해운", "크샨소프트",
    "규태식품", "경민엔터", "관광관광"
];
const DEFAULT_STOCK_MESSAGE = '```bash\n보유중인 주식이 없습니다! "/거래" 명령어로 주식 거래를 시작하세요!```';
const DEFAULT_LOAN_MESSAGE  = '```bash\n대출이 없습니다! "/대출" 명령어로 대출을 시작하세요!```';

/**
 * @typedef {Array<Object>} StockInfo
 * @property { Number } amount   Amount of stock
 * @property { Number } price Average price of shares bought by users
 */

/**
 * @description User's current stock information using Stock model
 * @param {String | Number} userid User's Discord ID
 * @returns {Promise<StockInfo>}
 */
const GetUserStock = async (userid) => {
    const stockModel = await Stock.GetUser(userid);
    const userStocks = stockModel.stock;
    
    let StockArray = [];
    
    for (const label of STOCK_LIST) {
        if (userStocks[label]) {
            StockArray.push({
                amount: userStocks[label].amount,
                price: userStocks[label].price
            });
        } else {
            StockArray.push({ amount: '-', price: 0 });
        }
    }
    
    // Check if user has any stocks
    const hasStocks = StockArray.some(stock => stock.amount !== '-');
    return hasStocks ? StockArray : [];
}

const CalcPnL = (CUR, AVG) => {
    let PnL = '';
    if (CUR > AVG) PnL += '+';
    else if (CUR < AVG) PnL += '-';
    else PnL += '•';

    PnL += ' ' + Math.abs((AVG - CUR) / (AVG===0?1:AVG) * 100).toFixed(2) + '%';

    return [PnL, CUR - AVG];
}

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id)) {
        return await interaction.reply({ 
            content: '회원가입이 되어있지 않아 실행할 수 없습니다.\n> 재미있는 주시기 봇을 즐기려면 `/가입`명령어로 주시기 봇에 가입하세요!', 
            flags: MessageFlags.Ephemeral 
        });
    }

    const userModel = await User.GetUser(user.id);
    
    let Message = `${user.toString()}님의 지갑\n`;

    const wallet = userModel.purse.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    const creditRate = userModel.credit;

    Message += `:moneybag: 보유 금액 \`${wallet}\`<:jusigi_coin:1136308344999653427>\n`;
    Message += `:credit_card: 신용 등급 ${creditRate === 1 ? ':crown:' : ''} \`${creditRate}등급\`<:credit_rate:1136312933001998488>\n\n`;

    const Stocks = await GetUserStock(user.id);
    if (Stocks.length === 0) Message += DEFAULT_STOCK_MESSAGE;
    else {
        const O = require('../../data/stock_data.json')
        Message += ':chart_with_upwards_trend: 보유 주식\n';
        Message += '```py\n';

        let BIGGEST = 0;
        for (const K of Stocks) {
            if (K.amount === '-') continue;
            
            const l = K.amount.toString().length;
            const minus = l === 3 ? -1 : 0;
            
            if ((l + l/3 + minus) > BIGGEST) BIGGEST = (l + l/3 + minus).toFixed(0);
        }

        for (let i = 0; i < Stocks.length; i++) {
            if (Stocks[i].amount === '-') continue;

            const Name = STOCK_LIST[i];
            const PnL  = CalcPnL(O[Name].history.at(-1), Stocks[i].price);
            const tmp  = [Stocks[i].amount, Stocks[i].amount.toString().length];
            Stocks[i].amount = Stocks[i].amount.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");

            if (PnL[0] === '• NaN%') PnL[0] = '• 0.00%';
            if (isNaN(PnL[1])) PnL[1] = 0;

            Message += `■ ${STOCK_LIST[i]}\t${' '.repeat(BIGGEST - Number(tmp[1]))}${Stocks[i].amount}주\t# 수익률 ${PnL[0]}\t${' '.repeat(14 - PnL[0].length)}손익 ${(Number(PnL[1]) * Number(tmp[0])).toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",")}시기\n`;
        }

        Message += '```';
    }
    
    Message += '\n';

    const deposit = await Deposit.GetUser(user.id);
    const bank = deposit.bank;

    if ((bank.loan.amount || 0) <= 0) {
        Message += DEFAULT_LOAN_MESSAGE;
    } else {
        Message += `:bank: 대출 정보\n`;
        Message += '```py\n'
        const interestRate = bank.loan.interest_rate;
        const loanAmount = bank.loan.amount;
        const dueDate = bank.loan.date;

        const currentLoanAmount = calculateCompoundInterest(
            loanAmount, 
            interestRate, 
            dueDate
        );

        Message += `대출 원금: ${commaByThree(loanAmount)}시기\n`
        Message += `이자: ${commaByThree(currentLoanAmount - parseInt(loanAmount))}시기\n`;
        Message += `대출 기간: ${moment(dueDate).format('YYYY년 M월 D일 H시 m분')}\n`;
        Message += `대출 이자율: ${interestRate}%\n`;
        Message += '```';
    }

    if (deposit.savings.amount > 0) {
        Message += `\n:handbag: 보통예금 정보\n`;
        Message += '```py\n';
        const savingsAmount = deposit.savings.amount;
        const interestRate = deposit.savings.interest_rate;

        Message += `예금 금액: ${commaByThree(savingsAmount)}시기\n`;
        Message += `이자: ${commaByThree(savingsAmount * interestRate * moment().diff(deposit.savings.timestamp, 'days'))}시기\n`;
        Message += `예금 시작일: ${moment(deposit.savings.timestamp).format('YYYY년 M월 D일 H시 m분')}부터\n`;
        Message += `예금 이자율: ${interestRate * 100}%\n`;
        Message += '```';
    }

    if (deposit.deposit.amount > 0) {
        Message += `\n:purse: 정기예금 정보\n`;
        Message += '```py\n';
        const depositAmount = deposit.deposit.amount;
        const interestRate = deposit.deposit.interest_rate;
        const due = deposit.deposit.due;

        const compounded = Math.floor(depositAmount * Math.pow(1 + interestRate, due))

        Message += `예금 금액: ${commaByThree(depositAmount)}시기\n`;
        Message += `예상 최종 이자: ${commaByThree(compounded - depositAmount)}시기\n`;
        Message += `예금 만기일: ${moment(deposit.deposit.timestamp).add(due, 'days').format('YYYY년 M월 D일 H시 m분')}\n`;
        Message += `예금 이자율: ${interestRate * 100}%\n`;
        Message += '```';
    }

    return await interaction.reply(Message);
}

module.exports.commandName = '지갑'