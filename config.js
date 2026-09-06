require('dotenv').config({ quiet: true });
const fs = require('node:fs');
function positive(name, fallback) {
    const value = process.env[name] || fallback;
    if (value == null) return null;
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`Invalid configuration: ${name}`);
    return n;
}
if (process.env.DB_TLS === 'false' && !['127.0.0.1','localhost'].includes(process.env.DB_HOST)) throw new Error('TLS required for remote MySQL');
module.exports = {
    db: { host: process.env.DB_HOST, port: positive('DB_PORT', 3306), user: process.env.DB_USER,
        password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'jusigi',
        ssl: process.env.DB_TLS === 'false' ? undefined : { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: fs.readFileSync(process.env.DB_SSL_CA) } : {}) },
        timezone: 'Z', supportBigNumbers: true, bigNumberStrings: true, connectionLimit: 10,
        connectTimeout: 10000, waitForConnections: true, queueLimit: 100 },
    redis: { host: process.env.REDIS_HOST, port: positive('REDIS_PORT', 10000), password: process.env.REDIS_ACCESS_KEY },
    loanTermDays: positive('LOAN_TERM_DAYS', 7), interval: positive('STOCK_UPDATE_INTERVAL_MS', 300000),
    token: process.env.TOKEN, applicationId: process.env.APPLICATION_ID,
    openai: { apiKey: process.env.OPENAI_API_KEY, organization: process.env.OPENAI_ORGANIZATION || undefined,
        project: process.env.OPENAI_PROJECT || undefined, model: process.env.OPENAI_MODEL || 'gpt-5-nano' }
};
