const assert = require('node:assert/strict');
const { test } = require('node:test');

const { DomainError } = require('../domain/money');
const { legacyStart, legacyAction, legacyStop } = require('../services/legacy-games');

class FakeDb {
    constructor() {
        this.games = new Map();
        this.cooldowns = new Map();
    }

    async execute(sql, params) {
        if (sql.startsWith('SELECT user_id,type,session_id,bet,state FROM games WHERE user_id=? AND type=?')) {
            const row = this.games.get(`${params[0]}:${params[1]}`);
            return [row ? [{ ...row, state: JSON.stringify(row.state) }] : [], []];
        }
        if (sql.startsWith('SELECT user_id,type,session_id,bet,state FROM games WHERE user_id=? AND session_id=?')) {
            const row = [...this.games.values()].find(value => value.user_id === params[0] && value.session_id === params[1]);
            return [row ? [{ ...row, state: JSON.stringify(row.state) }] : [], []];
        }
        if (sql.startsWith('SELECT user_id,type,session_id,bet,state FROM games WHERE user_id=? AND type IN')) {
            return [[...this.games.values()]
                .filter(row => row.user_id === params[0] && params.slice(1).includes(row.type))
                .map(row => ({ ...row, state: JSON.stringify(row.state) })), []];
        }
        if (sql.startsWith('INSERT INTO games')) {
            const [user_id, type, session_id, bet, state, created_at, updated_at] = params;
            this.games.set(`${user_id}:${type}`, {
                user_id, type, session_id, bet: String(bet), state: JSON.parse(state), created_at, updated_at
            });
            return [{ affectedRows: 1 }, []];
        }
        if (sql.startsWith('UPDATE games')) {
            const [, state, updated_at, user_id, type, session_id] = [null, ...params];
            const row = this.games.get(`${user_id}:${type}`);
            if (row && row.session_id === session_id) {
                row.state = JSON.parse(state);
                row.updated_at = updated_at;
            }
            return [{ affectedRows: row ? 1 : 0 }, []];
        }
        if (sql.startsWith('DELETE FROM games')) {
            const [user_id, type, session_id] = params;
            const row = this.games.get(`${user_id}:${type}`);
            if (row?.session_id === session_id) this.games.delete(`${user_id}:${type}`);
            return [{ affectedRows: row?.session_id === session_id ? 1 : 0 }, []];
        }
        if (sql.startsWith('INSERT INTO casino_state')) {
            this.cooldowns.set(`${params[0]}:${params[1]}`, params[2]);
            return [{ affectedRows: 1 }, []];
        }
        throw new Error(`Unexpected SQL: ${sql}`);
    }
}

function context({ balance = 2000000n, credit = 2, now = '2026-09-07T00:00:00.000Z', quiz } = {}) {
    const db = new FakeDb();
    const user = { id: 'user-1', balance, credit };
    const records = [];
    const cooldowns = new Set();
    return {
        db,
        user,
        now,
        records,
        async checkGamble(game, bet) {
            assert.equal(typeof bet, 'bigint');
            assert.ok(user.balance >= bet);
            assert.equal(cooldowns.has(game), false);
        },
        async recordGamble(game, bet, gross, outcome) {
            const tax = gross > 0n ? gross / 10n : 0n;
            user.balance += gross - tax;
            cooldowns.add(game);
            records.push({ game, bet, gross, tax, net: gross - tax, outcome });
            return {tax,net:gross-tax};
        },
        ...(quiz ? { quiz } : {})
    };
}

function wrongAnswer(answer) {
    return answer === 1 ? 2 : 1;
}

async function startFive(ctx, bet = 100000n) {
    const started = await legacyStart(ctx, { game: 'fiveask', bet });
    const row = ctx.db.games.get('user-1:fiveask');
    return { started, answer: row.state.answer };
}

test('fiveask reserves funds and settles a fifth wrong guess as a total loss', async () => {
    const ctx = context();
    const { started, answer } = await startFive(ctx);

    assert.equal(ctx.user.balance, 1900000n);
    for (let attempt = 0; attempt < 5; attempt++) {
        await legacyAction(ctx, { session: started.session, action: 'input' });
        const result = await legacyAction(ctx, {
            session: started.session,
            action: 'guess',
            guess: String(wrongAnswer(answer))
        });
        if (attempt < 4) assert.equal(result.kind, 'legacy_feedback');
        else assert.equal(result.outcome, 'loss');
    }

    assert.equal(ctx.user.balance, 1900000n);
    assert.equal(ctx.db.games.size, 0);
    assert.equal(ctx.records[0].gross, -100000n);
    assert.equal(ctx.records[0].net, -100000n);
});

test('fiveask success logs profit before tax and returns the reserved stake', async () => {
    const ctx = context();
    const { started, answer } = await startFive(ctx);

    await legacyAction(ctx, { session: started.session, action: 'input' });
    const result = await legacyAction(ctx, { session: started.session, action: 'guess', guess: answer });

    assert.equal(result.gross, 900000n);
    assert.equal(result.tax, 90000n);
    assert.equal(result.net, 810000n);
    assert.equal(ctx.user.balance, 2810000n);
    assert.equal(ctx.records[0].net, 810000n);
});

test('nonsense caps hints at two and records the actual hinted profit', async () => {
    const ctx = context({
        balance: 1000000n,
        quiz: { question: 'Q', choices: ['a', 'b', 'c', 'd', 'e'], answer: 2, comment: 'C', hints: ['H1', 'H2'] }
    });
    const started = await legacyStart(ctx, { game: 'nonsense', bet: 100000n, quiz: ctx.quiz });

    assert.equal((await legacyAction(ctx, { session: started.session, action: 'hint' })).number, 1);
    assert.equal((await legacyAction(ctx, { session: started.session, action: 'hint' })).number, 2);
    await assert.rejects(
        legacyAction(ctx, { session: started.session, action: 'hint' }),
        error => error instanceof DomainError
    );

    const result = await legacyAction(ctx, { session: started.session, action: 'answer', choice: 3 });
    assert.equal(result.gross, 50000n);
    assert.equal(result.tax, 5000n);
    assert.equal(result.net, 45000n);
    assert.equal(ctx.user.balance, 1045000n);
    assert.equal(ctx.records[0].gross, 50000n);
});

test('stale sessions cannot spend or settle a newer game', async () => {
    const ctx = context();
    const { started } = await startFive(ctx);

    await assert.rejects(
        legacyAction(ctx, { session: 'stale-session', action: 'input' }),
        error => error instanceof DomainError
    );
    assert.equal(ctx.user.balance, 1900000n);
    assert.equal(ctx.db.games.get('user-1:fiveask').session_id, started.session);
    assert.equal(ctx.records.length, 0);
});

test('halt settles every active legacy game using the conservative refund formulas', async () => {
    const ctx = context({ balance: 1000000n, quiz: { question: 'Q', choices: ['a', 'b', 'c', 'd', 'e'], answer: 0, hints: ['H1', 'H2'] } });
    const five = await startFive(ctx, 100000n);
    await legacyAction(ctx, { session: five.started.session, action: 'input' });
    await legacyAction(ctx, { session: five.started.session, action: 'guess', guess: wrongAnswer(five.answer) });

    const nonsense = await legacyStart(ctx, { game: 'nonsense', bet: 100000n, quiz: ctx.quiz });
    await legacyAction(ctx, { session: nonsense.session, action: 'hint' });
    const stopped = await legacyStop(ctx);

    assert.equal(stopped.stopped.length, 2);
    assert.deepEqual(stopped.stopped.map(result => result.refund).sort(), [66666n, 66666n]);
    assert.equal(ctx.user.balance, 933332n);
    assert.equal(ctx.db.games.size, 0);
    assert.equal(ctx.records.length, 2);
});
