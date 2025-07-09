const { query } = require('../util/query_db');

class Stock {
    static async isUserExists(id) {
        const result = (await query(`SELECT * FROM stock WHERE id = ${id}`))[0];
        return !!result;
    }
    static async GetUser(id) {
        const object = new Stock();
        await object.#Initialize(id);

        return object;
    }

    async #Initialize(id) {
        this._id = id;

        this._stock = {};
        if (await Stock.isUserExists(id)) {
            const results = await query(`SELECT * FROM stock WHERE id = ${id}`);

            for (const result of results) {
                this._stock[result.stock] = {
                    amount: result.amount,
                    price: result.price,
                    date: result.date
                };
            }
        }
    }

    get id() { return this._id; }
    get stock() { return this._stock; }
    get sum() {
        let sum = 0;
        for (const stock in this._stock) {
            sum += this._stock[stock].amount * require('../data/stock_data.json')[stock].history.at(-1);
        }

        return sum;
    }

    set stock({ stock, amount, price }) {
        if (this._stock[stock]) {
            this._stock[stock].amount += amount;
            this._stock[stock].price = price;
        } else {
            this._stock[stock] = {
                amount: amount,
                price: price
            };
        }
    }

    async apply() {
        for (const stock in this._stock) {
            const data = this._stock[stock];

            if (data.amount <= 0) {
                await query(`DELETE FROM stock WHERE id = ${this._id} AND stock = '${stock}'`);
            } else {
                await query(`INSERT INTO stock (id, stock, amount, price) VALUES (${this._id}, '${stock}', ${data.amount}, ${data.price})
ON DUPLICATE KEY UPDATE amount = ${data.amount}, price = ${data.price}`);
            }
        }
    }
}

module.exports = Stock;