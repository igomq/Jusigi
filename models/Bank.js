const { query } = require('../util/query_db');

class Bank {
    static async isUserExists(id) {
        const result = (await query(`SELECT * FROM bank WHERE id = ${id}`))[0];
        return !!result;
    }
    static async GetUser(id) {
        const object = new Bank();
        await object.#Initialize(id);

        return object;
    }

    async #Initialize(id) {
        this._id = id;

        this._loan = {};
        if (await Bank.isUserExists(id)) {
            const results = (await query(`SELECT * FROM bank WHERE id = ${id}`))[0];

            this._loan = {
                amount: results.amount,
                interest_rate: results.interest_rate,
                date: results.date
            }
        }
    }

    get id() { return this._id; }
    get loan() { return this._loan; }

    set loan({ amount, interest_rate }) {
        this._loan.amount = amount;

        if (interest_rate) this._loan.interest_rate = interest_rate;
    }

    async apply() {
        await query(`INSERT INTO bank (id, amount, interest_rate) VALUES (${this._id}, ${this._loan.amount}, ${this._loan.interest_rate})
ON DUPLICATE KEY UPDATE amount = ${this._loan.amount}, interest_rate = ${this._loan.interest_rate}`);
    }
}

module.exports = Bank;