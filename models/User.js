const { query } = require('../util/query_db');

class User {
    static async isUserExists(id) {
        const result = (await query(`SELECT * FROM user WHERE id = ${id}`))[0];
        return !!result;
    }
    static async GetUser(id) {
        const object = new User();
        await object.#Initialize(id);

        return object;
    }

    async #Initialize(id) {
        this._id = id;

        if (!await User.isUserExists(id)) {
            await query(`INSERT INTO user (id) VALUES (${id})`);
            this._purse = 100000;
            this._credit = 2;
        } else {
            const result = (await query(`SELECT * FROM user WHERE id = ${id}`))[0];
            this._purse = result.purse;
            this._credit = result.credit;
        }
    }

    get id() { return this._id; }
    get purse() { return this._purse; }
    get credit() { return this._credit; }

    set purse(value) { this._purse = value; }
    set credit(value) { this._credit = value; }

    async apply() {
        await query(`UPDATE user SET purse = ${this._purse}, credit = ${this._credit} WHERE id = ${this._id}`);
    }
}

module.exports = User;