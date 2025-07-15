const Bank = require('../../../models/Bank');
const User = require('../../../models/User');
const Stock = require('../../../models/Stock');

const moment = require('moment');

const { GetLoanInterestRateByUserCredit, GetLoanLimitWithCreditAndProperty } = require('./LoanMethods');

module.exports = async (client, interaction, user, pay = false) => {
    const id = user.id;
    const bank = await Bank.GetUser(id);

    const target = await User.GetUser(id);
    const credit = target.credit;
    const purse = target.purse;
    const interest_rate = GetLoanInterestRateByUserCredit(credit);

    if (pay) {
        const amount = interaction.options.getInteger('금액');
        if (amount <= 0)
            return await replyEphemeral(interaction, { content: '상환 금액은 0보다 커야 합니다.' });

        const currentLoanAmount = calculateCompoundInterest(
            bank.loan.amount, 
            bank.loan.interest_rate, 
            bank.loan.date
        );

        if (currentLoanAmount <= 0)
            return await replyEphemeral(interaction, { content: '상환할 대출이 없습니다.' });

        if (currentLoanAmount < amount)
            return await replyEphemeral(interaction, { content: `상환 금액이 현재 대출 금액보다 큽니다. 현재 대출금: ${commaByThree(currentLoanAmount)}원` });
    
        if (purse < amount)
            return await replyEphemeral(interaction, { content: '상환 금액이 보유 금액보다 큽니다.' });

        // 상환 처리
        target.purse -= amount;
        const remainingLoan = currentLoanAmount - amount;

        bank.loan = { amount: remainingLoan };

        await bank.apply();
        await target.apply();

        return await replyEphemeral(interaction, {
            content: `대출 상환이 완료되었습니다.\n상환 금액: ${commaByThree(amount)}원`
        });
    } else {
        if (bank.loan.amount > 0)
            return await replyEphemeral(interaction, { content: '이미 대출이 존재합니다. 상환 후 다시 시도해주세요.' });

        if (credit >= 4)
            return await replyEphemeral(interaction, { content: '대출을 받기 위해선 신용등급이 4 미만이여야 합니다.' });
        
        const stock = await Stock.GetUser(id);
        const sum = stock.sum;
        const limit = GetLoanLimitWithCreditAndProperty(credit, { stock: sum, purse: purse });

        const amount = interaction.options.getInteger('금액');
        
        if (amount <= 0) {
            return await replyEphemeral(interaction, { content: '대출 금액은 0보다 커야 합니다.' });
        } else if (amount > limit) {
            return await replyEphemeral(interaction, { content: `대출 금액은 최대 ${commaByThree(limit)}원까지 가능합니다.` });
        }
        
        target.purse += amount;
        bank.loan = { 
            amount: amount, 
            interest_rate: interest_rate
        };

        await bank.apply();
        await target.apply();
        
        // moment를 사용해서 대출일 포맷팅
        const loanDate = moment().format('YYYY년 MM월 DD일');
        
        return await replyEphemeral(interaction, {
            content: `대출이 성공적으로 등록되었습니다.\n금액: ${commaByThree(amount)}원\n이자율: 일 ${interest_rate}%\n대출일: ${loanDate}` 
        });
    }
}