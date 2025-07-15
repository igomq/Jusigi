const { query } = require('../util/query_db');

const CASINO_NAMES = ['홀짝', '슬롯머신', '다섯고개', '넌센스']
class Casino {
    static async isUserExists(id) {
        const result = (await query(`SELECT * FROM casino WHERE id = ${id}`))[0];
        return !!result;
    }
    static async GetUser(id) {
        const object = new Casino();
        await object.#Initialize(id);

        return object;
    }

    async #Initialize(id) {
        this._id = id;
        this._user = await require('./User').GetUser(id);

        this._casino = {};
        if (await Casino.isUserExists(id)) {
            const results = await query(`SELECT * FROM casino WHERE id = ${id}`);

            for (const game of results) {
                this._casino[CASINO_NAMES[game.type]] = {
                    played: game.played,
                    bet: game.bet,
                    profit: game.profit,
                    timestamp: game.timestamp
                }
            }
        }
    }

    get casino() { return this._casino; }
    get profitSum() {
        let sum = 0;
        for (const game in this._casino) {
            sum += this._casino[game].profit;
        }
        return sum;
    }

    get lastPlayed() {
        let last = 0;
        for (const game in this._casino) {
            if (this._casino[game].timestamp > last) {
                last = this._casino[game].timestamp;
            }
        }
        return last;
    }

    resetAllProfitLog() {
        for (const game in this._casino) {
            this._casino[game].profit = 0;
        }
    }

    makeGame(type, bet, resultBet) {
        if (this._user.credit === 3) {
            if (bet > 500000) return 500000;
        } else if (this._user.credit === 4) {
            if (bet > 100000) return 100000;
        }

        if (!this._casino[type]) this._casino[type] = {bet: 0, profit: 0, played: 0, timestamp: null};
        this._casino[type].bet += bet;
        this._casino[type].profit += resultBet;
        this._casino[type].played++;
        return 0;
    }

    async apply() {
        for (const game in this._casino) {
            const { played, bet, profit } = this._casino[game];
            const type = CASINO_NAMES.indexOf(game);

            await query(`INSERT INTO casino (id, type, played, bet, profit) VALUES (${this._id}, ${type}, ${played}, ${bet}, ${profit})
ON DUPLICATE KEY UPDATE played = ${played}, bet = ${bet}, profit = ${profit}`);
        }
    }
}

module.exports = Casino;