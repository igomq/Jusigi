const mysql = require('mysql2/promise');
const config = require('../config');
let pool;
function getPool() { return pool ||= mysql.createPool(config.db); }
async function transaction(work) {
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
}
async function close() { if (pool) { await pool.end(); pool = null; } }
module.exports = { getPool, transaction, close };
