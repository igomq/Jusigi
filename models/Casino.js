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

        this._casino = {};
        if (await Casino.isUserExists(id)) {
            const results = await query(`SELECT * FROM casino WHERE id = ${id}`);

            for (const game of results) {
                this._casino[CASINO_NAMES[game.type]] = {
                    played: game.played,
                    bet: game.bet,
                    timestamp: game.timestamp
                }
            }
        }
    }

    get casino() { return this._casino; }

    set casino({ name, bet }) {
        this._casino[name].bet = bet;
        this._casino[name].played++;
    }

    async apply() {
        for (const game in this._casino) {
            const { played, bet } = this._casino[game];
            const type = CASINO_NAMES.indexOf(game);

            await query(`INSERT INTO casino (id, type, played, bet) VALUES (${this._id}, ${type}, ${played}, ${bet})
ON DUPLICATE KEY UPDATE played = ${played}, bet = bet ${bet}`);
        }
    }
}

module.exports = Casino;