const GetLoanInterestRateByUserCredit = (credit) => {
    if (credit === 1) return 1;
    else if (credit === 2) return 3;
    else return 5;
}

const GetLoanLimitWithCreditAndProperty = (credit, property = { stock: 0, purse: 0 }) => {
    switch (credit) {
        case 1: return Math.floor(5 * (property.stock * 0.5 + property.purse));
        case 2: return Math.floor(2.5 * (property.stock * 0.5 + property.purse));
        case 3: return Math.floor(0.5 * property.purse);
        default: return 0;
    }
}

module.exports.GetLoanInterestRateByUserCredit = GetLoanInterestRateByUserCredit;
module.exports.GetLoanLimitWithCreditAndProperty = GetLoanLimitWithCreditAndProperty;