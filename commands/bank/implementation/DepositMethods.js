const GetSavingsInterestRateByUserCredit = (credit) => {
    let rate;
    switch (credit) {
        case 1: rate = 0.005; break;
        case 2: rate = 0.003; break;
        case 3: rate = 0.002; break;
        default: rate = 0.001; break;
    }

    return rate;
}

const GetDepositTaxRateByUserCredit = (credit) => {
    switch (credit) {
	case 1: return 0;
	case 2: return 7.5;
	default: return 15;
    }
}

const GetDepositInterestRateLimitByUserCredit = (credit) => {
    let limit;
    switch (credit) {
        case 1: limit = 7.5; break;
        case 2: limit = 5; break;
        case 3: limit = 3; break;
        default: limit = 1; break;
    }

    return limit;
}

const GetDepositInterestRateByUserCreditAndDue = (credit, due) => {
    let rate;
    switch (credit) {
        case 1: rate = 0.00085 * Math.pow(due, 2); break;
        case 2: rate = 0.00055 * Math.pow(due, 2); break;
        case 3: rate = 0.00038 * Math.pow(due, 2); break;
        default: rate = 0.00018 * Math.pow(due, 2); break;
    }

    return Math.min(rate, 0.01 * GetDepositInterestRateLimitByUserCredit(credit)).toFixed(5);
}

module.exports.GetSavingsInterestRateByUserCredit = GetSavingsInterestRateByUserCredit;
module.exports.GetDepositInterestRateLimitByUserCredit = GetDepositInterestRateLimitByUserCredit;
module.exports.GetDepositInterestRateByUserCreditAndDue = GetDepositInterestRateByUserCreditAndDue;
module.exports.GetDepositTaxRateByUserCredit = GetDepositTaxRateByUserCredit;
