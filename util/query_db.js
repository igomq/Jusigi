require('dotenv').config()
const mysql = require('mysql2')

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
})
connection.connect()

module.exports.query = (sql) => {
    return new Promise((resolve, reject) => {
            connection.query(sql, (err, row, field) => {
                if (err) reject(err)
                else resolve(row)
            })
        }
    )}