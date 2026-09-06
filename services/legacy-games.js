const crypto = require('node:crypto');
const OpenAI = require('openai');

const config = require('../config');
const { rows, one } = require('../repositories/economy');
const { DomainError, check, json, integer } = require('../domain/money');

const MIN_BET = 100000n;
const GAME_TYPES = new Set(['fiveask', 'nonsense']);

function fail(message) {
    throw new DomainError(message);
}

function idOf(ctx) {
    const id = ctx?.user?.id ?? ctx?.user?.userId;
    check(id != null && String(id).length > 0 && String(id).length <= 32, '사용자 정보를 확인해주세요.');
    return String(id);
}

function gameOf(value) {
    const game = String(value || '');
    check(GAME_TYPES.has(game), '지원하지 않는 미니게임입니다.');
    return game;
}

function amountOf(value) {
    let amount;
    try { amount = typeof value === 'bigint' ? value : BigInt(value); }
    catch { fail('베팅 금액을 확인해주세요.'); }
    check(amount >= MIN_BET, '최소 100,000시기를 베팅해야 합니다.');
    return amount;
}

function balanceOf(user) {
    let balance;
    try { balance = typeof user.balance === 'bigint' ? user.balance : BigInt(user.balance); }
    catch { fail('잔액을 확인해주세요.'); }
    check(balance >= 0n, '잔액을 확인해주세요.');
    return balance;
}

function nowOf(ctx) {
    const now = ctx?.now == null ? new Date() : new Date(ctx.now);
    check(!Number.isNaN(now.getTime()), '시간 정보를 확인해주세요.');
    return now;
}

function parseState(row) {
    if (typeof row.state === 'string') {
        try {
            return JSON.parse(row.state);
        } catch {
            fail('게임 상태를 읽을 수 없습니다.');
        }
    }
    if (Buffer.isBuffer(row.state)) {
        try {
            return JSON.parse(row.state.toString('utf8'));
        } catch {
            fail('게임 상태를 읽을 수 없습니다.');
        }
    }
    check(row.state && typeof row.state === 'object', '게임 상태를 읽을 수 없습니다.');
    return row.state;
}

function betOf(row) {
    let bet;
    try { bet = BigInt(row.bet); }
    catch { fail('게임 베팅 금액을 확인해주세요.'); }
    check(bet >= MIN_BET, '게임 베팅 금액을 확인해주세요.');
    return bet;
}

function sessionOf(value) {
    const session = String(value || '');
    check(/^[A-Za-z0-9-]{1,64}$/.test(session), '게임 세션을 확인해주세요.');
    return session;
}

function customId(session, userId, action) {
    const value = `lg:${sessionOf(session)}:${String(userId)}:${String(action)}`;
    check(value.length <= 100, '게임 버튼 정보가 너무 깁니다.');
    return value;
}

function parseCustomId(value) {
    const parts = String(value || '').split(':');
    if (parts.length !== 4 || parts[0] !== 'lg') return null;
    if (!/^[A-Za-z0-9-]{1,64}$/.test(parts[1]) || !parts[2] || !parts[3]) return null;
    return { session: parts[1], userId: parts[2], action: parts[3] };
}

function button(session, userId, action, label, style = 'primary') {
    return { customId: customId(session, userId, action), label, style };
}

function fraction(amount, numerator, denominator) {
    return amount * BigInt(numerator) / BigInt(denominator);
}

function fiveAskRefund(bet, attempts) {
    const used = 5 - attempts;
    check(Number.isInteger(attempts) && attempts >= 0 && attempts <= 5, '게임 시도를 확인해주세요.');
    return fraction(bet, 2 ** used, 3 ** used);
}

function nonsenseRefund(bet, usedHints) {
    check(Number.isInteger(usedHints) && usedHints >= 0 && usedHints <= 2, '힌트 사용 횟수를 확인해주세요.');
    return fraction(bet, 3 - usedHints, 3);
}

function nonsenseProfit(bet, usedHints) {
    return [fraction(bet, 5, 6), fraction(bet, 2, 3), fraction(bet, 1, 2)][usedHints];
}

async function gameRow(ctx, game) {
    return one(ctx.db,
        'SELECT user_id,type,session_id,bet,state FROM games WHERE user_id=? AND type=? FOR UPDATE',
        [idOf(ctx), game]);
}

async function sessionRow(ctx, session) {
    return one(ctx.db,
        'SELECT user_id,type,session_id,bet,state FROM games WHERE user_id=? AND session_id=? FOR UPDATE',
        [idOf(ctx), session]);
}

async function activeRows(ctx) {
    return rows(ctx.db,
        'SELECT user_id,type,session_id,bet,state FROM games WHERE user_id=? AND type IN (?,?) FOR UPDATE',
        [idOf(ctx), 'fiveask', 'nonsense']);
}

async function saveGame(ctx, { game, session, bet, state }) {
    const now = nowOf(ctx);
    await rows(ctx.db,
        `INSERT INTO games (user_id,type,session_id,bet,state,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE session_id=VALUES(session_id),bet=VALUES(bet),state=VALUES(state),updated_at=VALUES(updated_at)`,
        [idOf(ctx), game, session, bet.toString(), json(state), now, now]);
}

async function updateGame(ctx, row, state) {
    await rows(ctx.db,
        'UPDATE games SET state=?,updated_at=? WHERE user_id=? AND type=? AND session_id=?',
        [json(state), nowOf(ctx), idOf(ctx), row.type, row.session_id]);
}

async function deleteGame(ctx, row) {
    await rows(ctx.db,
        'DELETE FROM games WHERE user_id=? AND type=? AND session_id=?',
        [idOf(ctx), row.type, row.session_id]);
}

async function writeCooldown(ctx, game) {
    await rows(ctx.db,
        `INSERT INTO casino_state (user_id,type,last_played_at) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE last_played_at=VALUES(last_played_at)`,
        [idOf(ctx), game, nowOf(ctx)]);
}

function quizValue(raw, korean, english) {
    return raw[korean] ?? raw[english];
}

function normalizeQuiz(raw) {
    check(raw && typeof raw === 'object', '넌센스 퀴즈 형식이 올바르지 않습니다.');
    const question = String(quizValue(raw, '문제', 'question') || '').trim();
    const choices = quizValue(raw, '선택지', 'choices');
    const answer = Number(quizValue(raw, '정답', 'answer'));
    const comment = String(quizValue(raw, '해설', 'comment') || '').trim();
    const sourceHints = quizValue(raw, '힌트', 'hints');
    check(question.length > 0 && question.length <= 256 && Array.isArray(choices) && choices.length === 5, '넌센스 퀴즈 선택지를 확인해주세요.');
    check(Number.isInteger(answer) && answer >= 0 && answer < 5, '넌센스 퀴즈 정답을 확인해주세요.');
    check(choices.every(choice => typeof choice === 'string' && choice.trim().length > 0 && choice.length <= 500), '넌센스 퀴즈 선택지를 확인해주세요.');
    const hints = Array.isArray(sourceHints)
        ? sourceHints.slice(0, 2).map(hint => String(hint).trim().slice(0,1000)).filter(Boolean)
        : [];
    return { question, choices: choices.map(choice => choice.trim()), answer, comment, hints };
}

async function fetchQuizzes() {
    const openaiConfig = config.openai || {};
    if (!openaiConfig.apiKey) fail('넌센스 퀴즈 AI 설정이 없어 게임을 시작할 수 없습니다.');

    try {
        const openai = new OpenAI({
            apiKey: openaiConfig.apiKey,
            organization: openaiConfig.organization,
            project: openaiConfig.project, timeout: 10000, maxRetries: 0
        });
        const completion = await openai.chat.completions.create({
            model: openaiConfig.model,
            messages: [
                { role: 'system', content: '한국어 넌센스 퀴즈 출제자입니다.' },
                { role: 'user', content: '문제, 선택지 5개, 0부터 시작하는 정답 인덱스, 해설, 힌트 최대 2개를 가진 JSON 배열 10개만 반환하세요. 선택지는 짧은 한국어 말장난 퀴즈로 작성하세요.' }
            ]
        });
        const content = completion.choices?.[0]?.message?.content?.trim();
        const parsed = JSON.parse(content || 'null');
        check(Array.isArray(parsed), 'AI가 올바른 넌센스 퀴즈를 반환하지 않았습니다.');
        const normalized = parsed.map(normalizeQuiz);
        check(normalized.length > 0, '사용 가능한 넌센스 퀴즈가 없습니다.');
        return normalized;
    } catch (error) {
        if (error instanceof DomainError) throw error;
        throw new DomainError('넌센스 퀴즈를 준비하지 못했습니다.');
    }
}

async function nextQuiz() {
    return (await fetchQuizzes())[0];
}

function fiveAskView(session, userId, bet) {
    return {
        type: 'fiveask',
        title: '다섯고개 게임',
        description: '입력하기 버튼을 눌러 1~500 사이의 숫자를 입력하세요.',
        bet,
        buttons: [
            button(session, userId, 'i', '입력하기'),
            button(session, userId, 's', '안할래요', 'danger')
        ]
    };
}

function nonsenseView(session, userId, state, bet) {
    return {
        type: 'nonsense',
        title: state.question,
        description: '5지선다형 퀴즈입니다. 답변 버튼을 눌러주세요.',
        choices: state.choices,
        bet,
        buttons: [
            ...state.choices.map((_, index) => button(session, userId, `a${index + 1}`, `${index + 1}번`)),
            button(session, userId, 'h', '힌트보기', 'success'),
            button(session, userId, 's', '그만할래요', 'danger')
        ]
    };
}

function continuationView(session, userId, game) {
    return {
        buttons: game === 'fiveask'
            ? [button(session, userId, 'i', '계속 진행'), button(session, userId, 's', '그만할래요', 'danger')]
            : []
    };
}

async function settle(ctx, row, gross, outcome) {
    const bet = betOf(row);
    const balance = balanceOf(ctx.user);
    ctx.user.balance = balance + bet;
    const {tax,net}=await ctx.recordGamble(row.type, bet, gross, outcome);
    const itemDrop=outcome.outcome==='win'?await ctx.awardDrop(row.type):null;
    await deleteGame(ctx, row);
    return { bet, gross, tax, net, payout: bet + net, itemDrop };
}

function fiveAskState(row) {
    const state = parseState(row);
    check(Number.isInteger(state.answer) && state.answer >= 1 && state.answer <= 500, '게임 정답을 확인할 수 없습니다.');
    check(Number.isInteger(state.attempts) && state.attempts >= 0 && state.attempts <= 5, '게임 시도를 확인할 수 없습니다.');
    check(state.phase === 'input' || state.phase === 'guess', '게임 상태를 확인할 수 없습니다.');
    return state;
}

function nonsenseState(row) {
    const state = parseState(row);
    check(Array.isArray(state.choices) && state.choices.length === 5, '게임 선택지를 확인할 수 없습니다.');
    check(Number.isInteger(state.answer) && state.answer >= 0 && state.answer < 5, '게임 정답을 확인할 수 없습니다.');
    check(Number.isInteger(state.usedHints) && state.usedHints >= 0 && state.usedHints <= 2, '게임 힌트를 확인할 수 없습니다.');
    check(state.phase === 'answer', '게임 상태를 확인할 수 없습니다.');
    return state;
}

async function stopGame(ctx, row, state) {
    const bet = betOf(row);
    let refund;
    if (row.type === 'fiveask') {
        refund = fiveAskRefund(bet, state.attempts);
    } else {
        refund = nonsenseRefund(bet, state.usedHints);
    }
    const settled = await settle(ctx, row, refund - bet, { outcome: 'stop', refund });
    return { kind: 'legacy_settled', game: row.type, session: row.session_id, outcome: 'stop', refund, ...settled };
}

async function legacyStart(ctx, args = {}) {
    const game = gameOf(args.game);
    const bet = amountOf(args.bet);
    const userId = idOf(ctx);
    const existing = await gameRow(ctx, game);
    if (existing) fail('이미 진행중인 게임이 있습니다.');

    await ctx.checkGamble(game, bet);
    check(balanceOf(ctx.user) >= bet, '보유 금액보다 더 베팅할 수 없습니다.');

    const session = crypto.randomUUID();
    const random = typeof ctx.random === 'function' ? ctx.random() : Math.random();
    check(Number.isFinite(random) && random >= 0 && random < 1, '난수 범위를 확인해주세요.');
    const state = game === 'fiveask'
        ? {
            phase: 'input',
            answer: 1 + Math.floor(random * 500),
            attempts: 5
        }
        : {
            phase: 'answer',
            ...normalizeQuiz(args.quiz),
            usedHints: 0
        };
    check(game !== 'fiveask' || (Number.isInteger(state.answer) && state.answer >= 1 && state.answer <= 500), '게임 정답을 확인할 수 없습니다.');

    ctx.user.balance = balanceOf(ctx.user) - bet;
    await saveGame(ctx, { game, session, bet, state });
    await writeCooldown(ctx, game);

    return {
        kind: 'legacy_started',
        game,
        session,
        bet,
        dropChance: require('../domain/rules').dropChance(game,ctx.user.credit),
        message: game === 'fiveask'
            ? '다섯고개 게임을 시작했습니다. 입력하기 버튼을 눌러주세요.'
            : '넌센스 퀴즈를 시작했습니다. 답변 버튼을 눌러주세요.',
        view: game === 'fiveask'
            ? fiveAskView(session, userId, bet)
            : nonsenseView(session, userId, state, bet)
    };
}

function normalizeAction(args) {
    const action = String(args.action || '');
    if (action === 'i') return { action: 'input' };
    if (action === 'g') return { action: 'guess' };
    if (action === 'h') return { action: 'hint' };
    if (action === 's') return { action: 'stop' };
    const answer = /^a([1-5])$/.exec(action);
    if (answer) return { action: 'answer', choice: Number(answer[1]) };
    if (action === 'answer') return { action, choice: args.choice };
    if (action === 'guess') return { action };
    if (action === 'hint' || action === 'stop' || action === 'input') return { action };
    fail('게임 동작을 확인해주세요.');
}

async function legacyAction(ctx, args = {}) {
    const session = sessionOf(args.session);
    const requestedGame = args.game == null ? null : gameOf(args.game);
    const row = requestedGame ? await gameRow(ctx, requestedGame) : await sessionRow(ctx, session);
    check(row && String(row.session_id) === session, '이미 종료된 게임입니다.');
    check(!requestedGame || row.type === requestedGame, '이미 종료된 게임입니다.');

    const action = normalizeAction(args);
    if (action.action === 'stop') return stopGame(ctx, row, row.type === 'fiveask' ? fiveAskState(row) : nonsenseState(row));

    if (row.type === 'fiveask') {
        const state = fiveAskState(row);
        if (action.action === 'input') {
            check(state.attempts > 0, '남은 기회가 없습니다.');
            state.phase = 'guess';
            await updateGame(ctx, row, state);
            return { kind: 'legacy_modal', game: row.type, session, attempts: state.attempts, message: '1~500 사이의 숫자를 입력해주세요.' };
        }
        check(action.action === 'guess' && state.phase === 'guess', '먼저 입력하기 버튼을 눌러주세요.');
        const rawGuess = String(args.guess ?? '').trim();
        check(/^\d+$/.test(rawGuess) && Number.isSafeInteger(Number(rawGuess)), '1~500 사이의 숫자를 입력해주세요.');
        const guess = Number(rawGuess);
        check(guess >= 1 && guess <= 500, '1~500 사이의 숫자를 입력해주세요.');
        const remaining = state.attempts - 1;
        if (guess === state.answer) {
            const settled = await settle(ctx, row, betOf(row) * 9n, { outcome: 'win', guess, attempts: 6 - state.attempts });
            return { kind: 'legacy_settled', game: row.type, session, outcome: 'win', message: '정답입니다!', ...settled };
        }
        if (remaining === 0) {
            const settled = await settle(ctx, row, -betOf(row), { outcome: 'loss', guess, answer: state.answer, attempts: 5 });
            return { kind: 'legacy_settled', game: row.type, session, outcome: 'loss', message: '마지막 기회를 사용해 베팅 금액을 모두 잃었습니다.', ...settled };
        }
        state.attempts = remaining;
        state.phase = 'input';
        await updateGame(ctx, row, state);
        return {
            kind: 'legacy_feedback',
            game: row.type,
            session,
            outcome: 'wrong',
            message: guess > state.answer ? `${guess}보다 작습니다!` : `${guess}보다 큽니다!`,
            attempts: remaining,
            ...continuationView(session, idOf(ctx), row.type)
        };
    }

    const state = nonsenseState(row);
    if (action.action === 'hint') {
        check(state.usedHints < 2 && state.usedHints < state.hints.length, '힌트는 최대 2개까지 볼 수 있습니다.');
        const hint = state.hints[state.usedHints];
        state.usedHints++;
        await updateGame(ctx, row, state);
        return { kind: 'legacy_hint', game: row.type, session, number: state.usedHints, hint, remaining: 2 - state.usedHints, message: `[힌트 ${state.usedHints}]\n> ${hint}` };
    }
    check(action.action === 'answer', '답변 버튼을 확인해주세요.');
    const choice = Number(action.choice);
    check(Number.isInteger(choice) && choice >= 1 && choice <= 5, '답변을 확인해주세요.');
    if (choice === state.answer + 1) {
        const gross = nonsenseProfit(betOf(row), state.usedHints);
        const settled = await settle(ctx, row, gross, { outcome: 'win', choice, usedHints: state.usedHints });
        return { kind: 'legacy_settled', game: row.type, session, outcome: 'win', message: '정답입니다!', ...settled };
    }
    const settled = await settle(ctx, row, -betOf(row), {
        outcome: 'loss',
        choice,
        answer: state.answer + 1,
        usedHints: state.usedHints
    });
    return { kind: 'legacy_settled', game: row.type, session, outcome: 'loss', message: '틀렸습니다!', ...settled };
}

async function legacyStop(ctx, args = {}) {
    const requestedGame = args.game == null ? null : gameOf(args.game);
    const session = args.session == null ? null : sessionOf(args.session);
    let active;
    if (session) {
        const row = requestedGame ? await gameRow(ctx, requestedGame) : await sessionRow(ctx, session);
        check(row && String(row.session_id) === session, '이미 종료된 게임입니다.');
        active = [row];
    } else if (requestedGame) {
        const row = await gameRow(ctx, requestedGame);
        active = row ? [row] : [];
    } else {
        active = await activeRows(ctx);
    }

    const stopped = [];
    for (const row of active) {
        const state = row.type === 'fiveask' ? fiveAskState(row) : nonsenseState(row);
        stopped.push(await stopGame(ctx, row, state));
    }
    if(!requestedGame&&!session)stopped.push(...(await ctx.stopMinigames()).stopped);
    return {
        kind: 'legacy_stopped',
        stopped,
        message: stopped.length > 0 ? '진행중인 게임을 모두 중지했습니다.' : '진행중인 게임이 없습니다.'
    };
}

function mapButtonAction(action) {
    if (action === 'i') return { action: 'input' };
    if (action === 'h') return { action: 'hint' };
    if (action === 's') return { action: 'stop' };
    if (/^a[1-5]$/.test(action)) return { action };
    return null;
}

function makeGuessModal(session, userId) {
    const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
    return new ModalBuilder()
        .setCustomId(customId(session, userId, 'g'))
        .setTitle('다섯고개 게임')
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('lg_guess')
                .setLabel('1~500 사이의 숫자를 입력하세요.')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('1~500')
        ));
}

async function handle(client, interaction) {
    const parsed = parseCustomId(interaction.customId);
    if (!parsed || parsed.userId !== String(interaction.user.id)) return false;
    const requestId = String(interaction.id);
    const userId = String(interaction.user.id);
    const { execute, respond } = require('../util/command');

    if (interaction.isModalSubmit?.()) {
        check(parsed.action === 'g', '지원하지 않는 게임 입력입니다.');
        const guess = interaction.fields.getTextInputValue('lg_guess');
        return execute(client, interaction, 'legacyAction', { session: parsed.session, action: 'guess', guess });
    }

    if (parsed.action === 'i') {
        const result = await client.economy.execute(userId, requestId, 'legacyAction', {
            session: parsed.session,
            action: 'input'
        });
        if (result?.kind === 'legacy_modal') return interaction.showModal(makeGuessModal(parsed.session, userId));
        return respond(interaction, result);
    }

    const action = mapButtonAction(parsed.action);
    if (!action) return false;
    return execute(client, interaction, 'legacyAction', { session: parsed.session, ...action });
}

module.exports = {
    MIN_BET, nextQuiz, handlers: {legacyStart, legacyAction, legacyStop},
    customId,
    parseCustomId,
    makeGuessModal,
    handle,
    legacyStart,
    legacyAction,
    legacyStop
};
