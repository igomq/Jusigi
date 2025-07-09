const { Chart, LinearScale, LineController, LineElement, PointElement, Legend } = require('chart.js');
const { Canvas } = require('skia-canvas');

Chart.register( LinearScale, LineController, LineElement, PointElement, Legend );

/** @type {number} */
const MAX_SIZE_CHART = 250;

/**
 * @typedef {Array<Object>} ChartData
 * @description 차트에 들어가는 데이터 형식
 *
 * @property {string} label
 * @property {string} color
 * @property {number[]} data
 */

/**
 * @description 입력된 정보를 기반으로 하여 chart.js를 통해 그래프를 생성하고 그래프 이미지 버퍼를 반환합니다.
 * @type { function(labels: string[], data: ChartData): Buffer }
 * @param { string[] } labels
 * @param { ChartData } data
 *
 * @return Buffer
 */
module.exports.createImage = async (labels, data) => {
    // 캔버스 생성
    const width = 800;
    const height = 450;
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext('2d');

    // 데이터셋 생성
    let datasets = [];
    for (const val of data) {
        datasets.push({
            label: val.label,
            borderColor: val.color,
            data: val.data,
            tension: 0.4,
            borderWidth: 2,
            fill: false,
        });
    }

    // X축 숫자 배열 생성 (-250부터 0까지)
    const numArr = new Array(MAX_SIZE_CHART).fill(0).map(
        (v, i) => -1 * (i)
    ).sort((a, b) => a-b);

    // 차트 설정
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: numArr,
            datasets: datasets
        },
        options: {
            responsive: false,
            plugins: {
                title: {
                    display: true,
                    text: '주시기 봇 모의주식 현황 그래프',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    grid: {
                        tickLength: 0,
                        drawBorder: true
                    },
                    title: {
                        display: true,
                        text: '시간(분)'
                    }
                },
                y: {
                    type: 'linear',
                    grid: {
                        drawBorder: true,
                        tickLength: 0
                    },
                    title: {
                        display: true,
                        text: '주가'
                    }
                }
            },
            elements: {
                point: {
                    radius: 0
                }
            }
        }
    });

    // 차트 렌더링
    await chart.render();

    // 이미지 버퍼로 변환
    return await canvas.toBuffer('png');
}