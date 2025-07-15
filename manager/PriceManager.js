const UPDATE_RATE = 1000;

const MAX_DATA_SAVING = 250;
const MARKET_AVERAGE_TARGET = 45000;
const MIN_STOCK_THRESHOLD = 6000;
const MAX_STOCK_THRESHOLD = 1000000; // 최대 주식 가격
const MAX_DEVIATION_RATIO= 2.5;

const RECOVERY_FORCE = 0.025;
const STABILIZATION_FORCE = 0.05;

const MAX_LOG_SIZE = 1024 * 1024 * 10;

const fs   = require('fs');

const { join } = require('path');

const logFilePath = join(__dirname, '../logs/price.log');

const logDir = join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const checkAndRotateLog = () => {
    if (!fs.existsSync(logFilePath)) return;

    const stats = fs.statSync(logFilePath);
    if (stats.size > MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archiveFileName = `price_${timestamp}.log.gz`;
        const archivePath = join(logDir, 'archive', archiveFileName);

        // 아카이브 디렉토리 생성
        const archiveDir = join(logDir, 'archive');
        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        try {
            // 기존 로그 파일을 압축하여 아카이브
            const readStream = fs.createReadStream(logFilePath);
            const writeStream = fs.createWriteStream(archivePath);
            const gzip = createGzip();

            readStream.pipe(gzip).pipe(writeStream);

            writeStream.on('finish', () => {
                // 압축 완료 후 기존 파일 삭제
                fs.unlinkSync(logFilePath);
                console.log(`로그 파일 압축 완료: ${archiveFileName}`);
            });

        } catch (error) {
            console.error('로그 파일 압축 중 오류:', error);
        }
    }
};

const originalConsoleLog = console.log;

console.log = (...args) => {
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    const logEntry = `[${timestamp}] ${message}\n`;

    // 로그 크기 체크 및 로테이션
    checkAndRotateLog();

    // 파일에 기록
    fs.appendFileSync(logFilePath, logEntry);

    // 콘솔에도 출력
    originalConsoleLog(...args);
};

const OriginStockData = require('../data/stock_data.json');
const StockLabels = require('../data/stock_labels.json').labels;

require('dotenv').config({ path: join(__dirname, '..', '.env') });
const OpenAI = require('openai');
const {createGzip} = require("node:zlib");
const openai = new OpenAI({
    organization: 'org-obV9Q057NQYZNa7UINwNIhYF',
    project: 'proj_eGkp1zyWEeDg7wbtZhJMlQ6o',
    apiKey: process.env.OPENAI_API_KEY
});

const Rand = (max, min) => Math.floor(Math.random() * (max - min + 1)) + min;

const saveNewsHistory = async (newsData) => {
    const historyPath = join(__dirname, '../', 'data', 'news.json');
    let newsHistory = [];

    if (fs.existsSync(historyPath)) {
        try {
            const data = await read(historyPath);
            newsHistory = JSON.parse(data);
        } catch (e) {
            console.error('뉴스 히스토리 파일 읽기 오류:', e);
            newsHistory = [];
        }
    }

    newsHistory.unshift(newsData);

    if (newsHistory.length > 6) {
        newsHistory = newsHistory.slice(0, 6);
    }

    await write(historyPath, JSON.stringify(newsHistory, null, 4));
    console.log(`뉴스 히스토리 저장: ${newsData.stock} (총 ${newsHistory.length}개)`);
};
const marketStabilization = (stockData) => {
    const prices = [], stockNames = [];

    // 시장 평균 계산
    for (const stock in stockData) {
        if (!stockData[stock].history || stockData[stock].history.length === 0) continue;
        const currentPrice = stockData[stock].history.at(-1);
        prices.push(currentPrice);
        stockNames.push(stock);
    }

    const marketAverage = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const deviationRatio = priceRange / marketAverage;

    console.log(`시장 현황 - 평균: ${marketAverage.toFixed(0)}, 최고: ${maxPrice.toFixed(0)}, 최저: ${minPrice.toFixed(0)}, 편차율: ${(deviationRatio * 100).toFixed(1)}%`);

    // 시장 평균이 너무 낮으면 전체적인 상승 압력 가하기
    if (marketAverage < MARKET_AVERAGE_TARGET * 0.95) {
        console.log(`시장 안정화 작동: 평균 가격 ${marketAverage.toFixed(2)} → 상승 압력 적용`);

        for (const stock of Object.keys(stockData)) {
            if (!stockData[stock].history || stockData[stock].history.length === 0) continue;

            // 평균과의 차이에 따라 최소 0.5%부터 15%까지 증가하게 해줘
            const currentPrice = stockData[stock].history.at(-1);
            const deviationFromAverage = currentPrice - marketAverage;
            const deviationRatio = Math.abs(deviationFromAverage) / marketAverage;
            const adjustmentForce = currentPrice * (0.005 + deviationRatio * 0.15); // 0.5% ~ 15% 사이의 증가
            const newPrice = Math.floor(currentPrice + adjustmentForce);
            const stabilizationBoost = Math.max(newPrice, MIN_STOCK_THRESHOLD); // 최소 가격 보장

            console.log(`${stock}: 시장 안정화 상승 (${currentPrice.toFixed(0)} → ${stabilizationBoost.toFixed(0)})`);

            if (stockData[stock].history.length >= MAX_DATA_SAVING) stockData[stock].history.shift();
            stockData[stock].history.push(stabilizationBoost);
        }
    }

    // 시장 평균이 너무 높으면 전체적인 하락 압력 가하기
    if (marketAverage > MARKET_AVERAGE_TARGET * 3) {
        console.log(`시장 안정화 작동: 평균 가격 ${marketAverage.toFixed(2)} → 하락 압력 적용`);

        for (const stock of Object.keys(stockData)) {
            if (!stockData[stock].history || stockData[stock].history.length === 0) continue;

            const currentPrice = stockData[stock].history.at(-1);
            const deviationFromAverage = currentPrice - marketAverage;
            const deviationRatio = Math.abs(deviationFromAverage) / marketAverage;
            const adjustmentForce = currentPrice * (0.05 + deviationRatio * 0.35); // 5% ~ 35% 사이의 감소
            const newPrice = Math.floor(currentPrice - adjustmentForce);
            const stabilizationBoost = Math.max(newPrice, MIN_STOCK_THRESHOLD); // 최소 가격 보장

            console.log(`${stock}: 시장 안정화 하락 (${currentPrice.toFixed(0)} → ${stabilizationBoost.toFixed(0)})`);

            if (stockData[stock].history.length >= MAX_DATA_SAVING) stockData[stock].history.shift();
            stockData[stock].history.push(stabilizationBoost);
        }
    }

    if (deviationRatio > MAX_DEVIATION_RATIO && marketAverage > MARKET_AVERAGE_TARGET) {
        console.log(`편차 안정화 작동 - 편차율 ${(deviationRatio * 100).toFixed(1)}% → 조정 시작`);

        for (let i = 0; i < stockNames.length; i++) {
            const stock = stockNames[i];
            const currentPrice = prices[i];
            const deviationFromAverage = currentPrice - marketAverage;
            const deviationRatio = Math.abs(deviationFromAverage) / marketAverage;

            // 편차가 20% 이상인 주식들을 조정
            if (deviationRatio > 0.2) {
                let adjustmentForce = 0;

                if (currentPrice > marketAverage) {
                    // 평균보다 높은 주식 → 하락 압력
                    adjustmentForce = -currentPrice * STABILIZATION_FORCE * (deviationRatio * 2);
                    console.log(`${stock}: 고가 조정 (${currentPrice.toFixed(0)} → ${adjustmentForce.toFixed(0)})`);
                } else {
                    // 평균보다 낮은 주식 → 상승 압력
                    adjustmentForce = currentPrice * STABILIZATION_FORCE * (deviationRatio * 2);
                    console.log(`${stock}: 저가 조정 (${currentPrice.toFixed(0)} → +${adjustmentForce.toFixed(0)})`);
                }

                const newPrice = Math.floor(currentPrice + adjustmentForce);
                const finalPrice = Math.max(MIN_STOCK_THRESHOLD, newPrice); // 최소가 보장

                if (stockData[stock].history.length >= MAX_DATA_SAVING) {
                    stockData[stock].history.shift();
                }
                stockData[stock].history.push(finalPrice);
            }
        }
    }

    return stockData;
};

function write(path, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, data, (err) => {
            if (err) reject(err);
            else resolve();
        });
    })
}
function read(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf-8', (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    })
}

const queryBody = (stock) => {
    return {
        model: "gpt-4.1-nano",
        messages: [
            { role: 'system', content: 'You are a journalist writing an article about the stock market.' },
            { role: 'user', content: `Write four interesting news about the stock ${stock}. Each news should be assigned randomly to one of the four stages: "매우 긍정", "긍정", "부정", or "매우 부정".\n` +
                    'You can pick any stage multiple times, so all four pieces of news could be "긍정", or three could be "매우 부정" and one "매우 긍정", etc. MAKE SURE ALL 4^4 CASES ARE POSSIBLE.\n' +
                    'Write realistic, but concise titles and summaries.\n' +
                    'Return ONLY the following JSON format (NO markdown):\n' +
                    '[\n' +
                    '  {"단계": "긍정", "제목": "내용", "요약": "내용"},\n' +
                    '  {"단계": "매우 부정", "제목": "내용", "요약": "내용"},\n' +
                    '  {"단계": "긍정", "제목": "내용", "요약": "내용"},\n' +
                    '  {"단계": "부정", "제목": "내용", "요약": "내용"}\n' +
                    ']\n' +
                    'Answer in Korean and change only the news content and 단계, don\'t change the format.\n' +
                    'Make sure the number of news is exactly 4, and each news has a unique title and summary.\n' +
                    'Only include Korean or English characters in the title and summary, no other languages.\n'
            }
        ]
    }
}

let newsStock = '곰큐항공', newsInfluence = 0, remainNewsEffect = 0, newsTime = 0;
let isNewsActive = false;

let stabilizationCounter = 0;

let intervalId = null;

module.exports = async () => {
    if (intervalId) clearInterval(intervalId);
    console.log("Stock Data Updater Start");

    let info = {count: 0, del: false}

    intervalId = setInterval(async () => {
        if (stabilizationCounter === 10) {
            stabilizationCounter = 0;
            let stabilized = marketStabilization(OriginStockData);

            for (const stock in stabilized) {
                OriginStockData[stock].history = stabilized[stock].history;
            }
        }
        ++stabilizationCounter;

        if (newsTime <= 0) {
            newsTime = 10;
            remainNewsEffect = 5;
            newsStock = StockLabels[Math.floor(Math.random() * StockLabels.length)];
            isNewsActive = false;
        }

        info.count++;
        if (newsStock && newsTime === 6 && !isNewsActive) {
            isNewsActive = true;
            const newsFilePath = join(__dirname, '../', 'data', 'news', `${newsStock}.json`);
            try {
                let shouldCreateNews = false;

                if (!fs.existsSync(newsFilePath)) {
                    shouldCreateNews = true;
                } else {
                    const existingNews = await read(newsFilePath);
                    const parsedNews = JSON.parse(existingNews);
                    if (Object.keys(parsedNews).length === 0) {
                        shouldCreateNews = true;
                    }
                }

                if (shouldCreateNews) {
                    console.log(`API 요청 시작: ${newsStock}`);
                    const completion = await openai.chat.completions.create(queryBody(newsStock));
                    await write(newsFilePath, completion.choices[0].message.content);
                }

                const newsData = await read(newsFilePath);
                const news = JSON.parse(newsData);
                const idx = Math.floor(Math.random() * news.length), content = news[idx];

                const sentiment = content["단계"], title = content["제목"], summary = content["요약"];
                switch (sentiment) {
                    case "매우 긍정":
                        newsInfluence = 2;
                        break;
                    case "긍정":
                        newsInfluence = 1;
                        break;
                    case "부정":
                        newsInfluence = -1;
                        break;
                    case "매우 부정":
                        newsInfluence = -2;
                        break;
                    default:
                        newsInfluence = 0;
                }

                const newsHistoryData = {
                    stock: newsStock,
                    sentiment: sentiment,
                    title: title,
                    summary: summary,
                    createdAt: Date.now()
                }
                await saveNewsHistory(newsHistoryData);

                news.splice(idx, 1);
                await write(newsFilePath, JSON.stringify(news, null, 4));
                isNewsActive = true;
                console.log(`뉴스 처리 완료: ${newsStock}, 영향도: ${newsInfluence}`);
            } catch (e) {
                console.error(`뉴스 처리 중 오류 발생: ${newsStock}\n 해당 뉴스 파일을 삭제합니다.`, e);

                if (fs.existsSync(newsFilePath)) fs.rmSync(newsFilePath);

                isNewsActive = false;
                newsInfluence = 0;
            }
        }

        for (const stock in OriginStockData) {
            if (OriginStockData[stock].hasOwnProperty("history")) {
                const stockData = OriginStockData[stock];
                const pushNew = () => stockData.history.push(Rand(stockData.startRange[0], stockData.startRange[1]));

                if (stockData.history.length >= MAX_DATA_SAVING) stockData.history.shift();
                if (stockData.history.length === 0) pushNew();
                else {
                    const last = stockData.history.at(-1);

                    if (stock === newsStock && isNewsActive && newsTime > 0 && remainNewsEffect > 0) {
                        let range = 0.1, diff = -0.05;
                        switch (newsInfluence) {
                            case 2:
                                range = 0.075;
                                diff = 0.05;
                                break;
                            case 1:
                                range = 0.05;
                                diff = 0.00;
                                break;
                            case -1:
                                range = 0.05;
                                diff = -0.05;
                                break;
                            case -2:
                                range = 0.05;
                                diff = -0.075;
                                break;
                        }

                        let newPrice = Math.floor(parseInt(last) * (1 + Math.random() * range + diff))
                        if (newPrice < 100) newPrice = 100 + Math.floor(Math.random() * 100);
                        stockData.history.push(newPrice);

                        remainNewsEffect--;
                    } else {
                        let newPriceRange = 0.05;
                        let newPriceSign = Math.random() < 0.5 ? -1 : 1;

                        let newPrice = Math.floor(parseInt(last) * (1 + newPriceSign * (Math.random() * newPriceRange)));
                        if (newPrice < MIN_STOCK_THRESHOLD) {
                            // 최소 가격 아래로 떨어지면 강제 상승
                            const recoveryForce = MIN_STOCK_THRESHOLD * RECOVERY_FORCE;
                            let force = recoveryForce - (newPrice - MIN_STOCK_THRESHOLD);
                            console.log(`${stock}: 최소 가격 보호 작동 (${newPrice.toFixed(2)} → ${(force + newPrice).toFixed(2)})`);

                            newPrice += force;
                        } else if (newPrice < MIN_STOCK_THRESHOLD * 1.2) {
                            // 최소 가격 근처에서는 상승 확률 증가
                            const recoveryBonus = MIN_STOCK_THRESHOLD * RECOVERY_FORCE * (Math.random() * 0.75 + 0.25).toFixed(1);
                            if (Math.random() < 0.7) { // 70% 확률로 추가 상승
                                newPrice += recoveryBonus;
                                console.log(`${stock}: 저가 회복 보너스 적용 (+${recoveryBonus.toFixed(2)})`);
                            }
                        }

                        if (newPrice > MAX_STOCK_THRESHOLD) {
                            // 최대 가격 초과 방지
                            newPrice = MAX_STOCK_THRESHOLD;
                            console.log(`${stock}: 최대 가격 보호 작동 (${last.toFixed(2)} → ${newPrice.toFixed(2)})`);
                        } else if (newPrice > MAX_STOCK_THRESHOLD * 0.92) {
                            // 최대 가격 근처에서는 하락 확률 증가
                            const stabilizationBonus = MAX_STOCK_THRESHOLD * STABILIZATION_FORCE * (Math.random() * 0.75 + 0.25).toFixed(1);
                            if (Math.random() < 0.7) { // 70% 확률로 추가 하락
                                newPrice -= stabilizationBonus;
                                console.log(`${stock}: 고가 안정화 패널티 적용 (-${stabilizationBonus.toFixed(2)})`);
                            }
                        }

                        stockData.history.push(newPrice);
                    }

                    OriginStockData[stock] = stockData;
                    fs.writeFileSync(join(__dirname, '../', 'data', 'stock_data.json'),
                        JSON.stringify(OriginStockData, null, 4));
                }
            }
        }

        --newsTime;

        OriginStockData.lastUpdate = Date.now();
        fs.writeFileSync(join(__dirname, '../', 'data', 'stock_data.json'),
            JSON.stringify(OriginStockData, null, 4));
    }, UPDATE_RATE)

    return intervalId;
}