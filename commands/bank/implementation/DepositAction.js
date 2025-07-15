const DepositAction = require("../../../models/Deposit");
const User = require("../../../models/User");

const moment = require("moment");

const { GetDepositTaxRateByUserCredit, GetSavingsInterestRateByUserCredit, GetDepositInterestRateByUserCreditAndDue } = require("./DepositMethods");

module.exports = async (client, interaction, user, pop = false) => {
    const style = interaction.options.getString('종류');
    const amount = interaction.options.getInteger('금액');
    const period = interaction.options.getInteger('기간');

    const deposit = await DepositAction.GetUser(user.id);
    const author = await User.GetUser(user.id);

    if (pop) {
        if (style === 'savings') {
            let amount = deposit.savings.amount;
            let interest_rate = deposit.savings.interest_rate;

            if (amount <= 0)
                return await replyEphemeral(interaction, {content: '인출 가능한 보통 예금이 없습니다.'});

            // let taxRate = GetDepositTaxRayeByUserCredit(author.credit);
            let final = amount + amount * interest_rate * moment().diff(deposit.savings.timestamp, 'days');
            author.purse += final;

            deposit.savings.amount = 0;
            await deposit.apply();
            await author.apply();

            return await reply(interaction, {content: `보통 예금이 성공적으로 인출되었습니다. 금액: ${commaByThree(final)}원`});
        } else {
            let due = deposit.deposit.due;

            if (moment().diff(deposit.deposit.timestamp, 'days') < due)
                return await replyEphemeral(interaction, {content: '정기예금의 기간이 아직 만료되지 않았습니다.'});

            let amount = deposit.deposit.amount;
            let interest_rate = deposit.deposit.interest_rate;

            if (amount <= 0)
                return await replyEphemeral(interaction, {content: '인출 가능한 정기 예금이 없습니다.'});

            let taxRate = GetDepositTaxRateByUserCredit(author.credit);
            let final = Math.floor(amount * Math.pow(1 + interest_rate, due)) * (1 - 0.01 * taxRate);
            author.purse += final;
            deposit.deposit.amount = 0;
            deposit.deposit.due = 0;

            await deposit.apply();
            await author.apply();

            return await reply(interaction, {content: `정기예금이 성공적으로 인출되었습니다. 금액: ${commaByThree(final)}원`});
        }
    }
    else {
        if (amount <= 0) return await replyEphemeral(interaction, {content: '입금 금액은 0보다 커야 합니다.'});

        if (style === 'savings') {
            if (amount > author.purse) return await replyEphemeral(interaction, {content: '보유 금액이 부족합니다.'});
            author.purse -= amount;

            deposit.makeSavings(
                amount + (deposit.savings.amount || 0) * deposit.savings.interest_rate
                    * (moment().diff(deposit.savings.timestamp, 'days') || 0),
                GetSavingsInterestRateByUserCredit(author.credit));

            await deposit.apply();
            await author.apply();

            return await reply(interaction, {content: `보통 예금이 성공적으로 등록되었습니다. 금액: ${commaByThree(deposit.savings.amount)}원, 이자율: ${deposit.savings.interest_rate * 100}%`});
        }
        else {
            if (!period || period <= 0)
                return await replyEphemeral(interaction, {content: '정기예금의 기간을 제대로 입력해주세요. (일 단위)'});

            if (deposit.deposit.amount > 0)
                return await replyEphemeral(interaction, {content: '이미 정기 예금이 존재합니다. 만기일에 인출 후 다시 시도해주세요.'});

            if (amount > author.purse) return await replyEphemeral(interaction, {content: '보유 금액이 부족합니다.'});
            author.purse -= amount;

            deposit.makeDeposit(amount, period, GetDepositInterestRateByUserCreditAndDue(author.credit, period));

            await deposit.apply();
            await author.apply();

            return await reply(interaction, {content: `정기 예금이 성공적으로 등록되었습니다. 금액: ${commaByThree(deposit.deposit.amount)}원, 기간: ${period}일, 이자율: ${deposit.deposit.interest_rate * 100}%`});
        }
    }
}
