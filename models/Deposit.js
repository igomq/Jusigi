const Bank = require('./Bank');
const { query } = require('../util/query_db');

class Deposit {
    static async isUserExists(id) {
        const result = (await query(`SELECT * FROM deposit WHERE id = ${id}`))[0];
        return !!result;
    }

    static async GetUser(id) {
        const object = new Deposit();
        await object.#Initialize(id);
        return object;
    }

    async #Initialize(id) {
        this._id = id;
        this._bank = await Bank.GetUser(id);
        this._savings = {
            amount: 0,
            interest_rate: 0,
            timestamp: null
        };
        this._deposit = {
            amount: 0,
            interest_rate: 0,
            due: 0,
            timestamp: null
        };

        if (await Deposit.isUserExists(id)) {
            const savings_result = (await query(`SELECT * FROM deposit WHERE id = ${id} AND type = FALSE`))[0];
            const deposit_result = (await query(`SELECT * FROM deposit WHERE id = ${id} AND type = TRUE`))[0];

            this._savings = {
                amount: !!savings_result ? savings_result.amount : 0,
                interest_rate: !!savings_result ? savings_result.interest_rate : 0,
                timestamp: !!savings_result ? savings_result.timestamp : null,
            };

            this._deposit = {
                amount: !!deposit_result ? deposit_result.amount : 0,
                interest_rate: !!deposit_result ? deposit_result.interest_rate : 0,
                due: !!deposit_result ? deposit_result.due : 0,
                timestamp: !!deposit_result ? deposit_result.timestamp : null,
            };
        }
    }

    get bank() { return this._bank; }
    get id() { return this._id; }
    get savings() { return this._savings; }
    get deposit() { return this._deposit; }

    makeSavings(amount, interest_rate) {
        this._savings.amount = amount;
        this._savings.interest_rate = interest_rate;
        this._savings.timestamp = new Date();
    }

    makeDeposit(amount, due, interest_rate) {
        this._deposit.amount = amount;
        this._deposit.interest_rate = interest_rate
        this._deposit.due = due;
    }

    async apply() {
        await query(`INSERT INTO deposit (id, type, amount, interest_rate) VALUES (${this._id}, FALSE, ${this._savings.amount}, ${this._savings.interest_rate})
ON DUPLICATE KEY UPDATE amount = ${this._savings.amount}, interest_rate = ${this._savings.interest_rate}`);
        await query(`INSERT INTO deposit (id, type, amount, interest_rate, due) VALUES (${this._id}, TRUE, ${this._deposit.amount}, ${this._deposit.interest_rate}, ${this._deposit.due})
ON DUPLICATE KEY UPDATE amount = ${this._deposit.amount}, interest_rate = ${this._deposit.interest_rate}, due = ${this._deposit.due}`);
    }
}

module.exports = Deposit;