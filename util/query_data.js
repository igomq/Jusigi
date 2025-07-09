const { readFileSync } = require('fs');
const { join } = require('path');

/**
 * @description 입력받은 종목의 주가 기록을 반환합니다.
 * @param {string} label
 * @returns {Array<Number>}
 */
module.exports.queryStockHistory = (label) => JSON.parse(readFileSync(join(__dirname, '../', 'data','stock_data.json')))[label].history;

/**
 * @description 입력받은 종목의 색상을 반환합니다.
 * @param {String} label
 * @returns {RGB}
 */
module.exports.queryStockColor   = (label) => JSON.parse(readFileSync(join(__dirname, '../', 'data','stock_data.json')))[label].color;