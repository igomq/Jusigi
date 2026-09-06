const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const config = require('../config');
async function migrate() {
    if (!/^[a-zA-Z0-9_]+$/.test(config.db.database)) throw new Error('Invalid DB_NAME');
    const connection = await mysql.createConnection({ ...config.db, database: undefined });
    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.changeUser({ database: config.db.database });
        const [[lock]] = await connection.query("SELECT GET_LOCK('jusigi:migrate', 10) AS acquired");
        if (Number(lock.acquired) !== 1) throw new Error('Migration lock unavailable');
        await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)');
        for (const file of (await fs.readdir(path.join(__dirname, 'migrations'))).filter(n => n.endsWith('.sql')).sort()) {
            const sql = await fs.readFile(path.join(__dirname, 'migrations', file), 'utf8');
            const checksum = crypto.createHash('sha256').update(sql).digest('hex');
            const [existing] = await connection.execute('SELECT checksum FROM schema_migrations WHERE version=?', [file]);
            if (existing.length) { if (existing[0].checksum !== checksum) throw new Error(`Migration checksum mismatch: ${file}`); continue; }
            // MySQL DDL commits implicitly. A failed migration is reported, never silently marked complete.
            for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(statement);
            await connection.execute('INSERT INTO schema_migrations(version,checksum) VALUES (?,?)', [file, checksum]);
            console.info(`Applied ${file}`);
        }
    } finally { await connection.end(); }
}
if (require.main === module) migrate().catch(e => { console.error('Migration failed:', e.code || e.name); process.exitCode = 1; });
module.exports = { migrate };
