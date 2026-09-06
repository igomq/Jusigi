// SQL and row locking live here. All financial services share one transaction connection.
async function rows(db, sql, params = []) { return (await db.execute(sql, params))[0]; }
async function one(db, sql, params = []) { return (await rows(db, sql, params))[0]; }
const account = (db,id) => one(db,'SELECT * FROM users WHERE id=? FOR UPDATE',[id]);
const loans = (db,id) => rows(db,'SELECT * FROM loans WHERE user_id=? ORDER BY opened_at,id FOR UPDATE',[id]);
const holdings = (db,id) => rows(db,'SELECT h.*,p.price FROM holdings h JOIN stock_prices p ON p.symbol=h.symbol WHERE h.user_id=?',[id]);
const savings = (db,id) => one(db,'SELECT * FROM savings WHERE user_id=? FOR UPDATE',[id]);
const terms = (db,id) => rows(db,'SELECT * FROM term_deposits WHERE user_id=? ORDER BY matures_at,id FOR UPDATE',[id]);
const inventory = (db,id) => rows(db,'SELECT i.*,d.name,d.type,d.effect,d.base_rate FROM inventory i JOIN item_definitions d ON d.id=i.item_id WHERE i.user_id=? ORDER BY i.id',[id]);
module.exports = { rows, one, account, loans, holdings, savings, terms, inventory };
