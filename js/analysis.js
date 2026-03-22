// ==========================================
// ANALYSIS — Analysis panel + chart
// ==========================================

import { STOCK_KR, PERIODS } from './config.js';
import {
    macroData, rawCandles, candleCache, currentChart,
    setCurrentChart, currentTab, stocks, tsToDate
} from './state.js';
import { fetchCandleDataFull, fetchKoreanNews } from './api.js';
import { calcSMA, calcRSI, detectTrend, detectCross, detectPattern, generateSummary } from './technical.js';
import { getSignal } from './ui.js';

export async function openAnalysis(symbol) {
    const panel = document.getElementById('analysisPanel');
    const overlay = document.getElementById('analysisOverlay');
    const kr = STOCK_KR[symbol] || '';
    document.getElementById('apTitle').innerHTML = `${symbol} <span style="font-weight:400;font-size:14px;" class="text-secondary">${kr}</span>`;
    document.getElementById('apBody').innerHTML = '<div class="news-loading">분석 데이터를 불러오는 중...</div>';
    panel.classList.add('active');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Ensure raw candle data
    if (!rawCandles[symbol]) await fetchCandleDataFull(symbol);

    const raw = rawCandles[symbol];
    const quote = macroData[symbol] || {};
    const price = quote.c || 0, change = quote.d || 0, cp = quote.dp || 0;
    const dirClass = change >= 0 ? 'gain' : 'loss';
    const arrow = change >= 0 ? '\u25b2' : '\u25bc';

    // Find stock data for P&L
    let stockData = null;
    for (const c in stocks) {
        const found = stocks[c].find(x => x.symbol === symbol);
        if (found) { stockData = found; break; }
    }

    let analysisHTML = '';

    // Price hero
    analysisHTML +=
        `<div class="ap-section ap-price-hero">` +
            `<div class="ap-price">$${price ? price.toFixed(2) : '--'}</div>` +
            `<div class="ap-price-change ${dirClass}">${arrow} ${Math.abs(change).toFixed(2)} (${cp > 0 ? '+' : ''}${cp.toFixed(2)}%)</div>` +
        `</div>`;

    if (raw && raw.c?.length > 20) {
        const closes = raw.c;
        const sma5 = calcSMA(closes, 5);
        const sma20 = calcSMA(closes, 20);
        const sma60 = calcSMA(closes, 60);
        const rsi = calcRSI(closes);
        const trend = detectTrend(closes, sma20, sma60);
        const cross = detectCross(sma5, sma20);
        const pattern = detectPattern(closes);
        const summary = generateSummary(closes, rsi, trend, cross, pattern);

        // Signal summary card
        analysisHTML +=
            `<div class="ap-signal ${summary.cls}">` +
                `<div class="ap-signal-title">${summary.icon} ${summary.label}</div>` +
                `<div class="ap-signal-body">${summary.body}</div>` +
            `</div>`;

        // P&L card
        if (stockData && stockData.avgCost && stockData.shares && price) {
            const totalCost = stockData.avgCost * stockData.shares;
            const totalValue = price * stockData.shares;
            const pl = totalValue - totalCost;
            const plPct = ((price - stockData.avgCost) / stockData.avgCost * 100);
            const plCls = pl >= 0 ? 'gain' : 'loss';
            const plBgCls = pl >= 0 ? 'color-gain-bg' : 'color-loss-bg';
            const plSign = pl >= 0 ? '+' : '';
            const targetPrice = stockData.targetReturn ? (stockData.avgCost * (1 + stockData.targetReturn / 100)) : 0;
            const targetDist = targetPrice && price ? ((targetPrice - price) / price * 100).toFixed(1) : 0;

            analysisHTML +=
                `<div class="ap-section">` +
                    `<div class="ap-section-title">내 투자 현황</div>` +
                    `<div class="ap-investment">` +
                        `<div class="ap-investment-grid">` +
                            `<div><div class="ap-investment-label">매수 단가</div><div class="ap-investment-value">$${stockData.avgCost.toFixed(2)}</div></div>` +
                            `<div><div class="ap-investment-label">수량</div><div class="ap-investment-value">${stockData.shares}주</div></div>` +
                            `<div><div class="ap-investment-label">투자금</div><div class="ap-investment-value">$${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>` +
                            `<div><div class="ap-investment-label">평가금</div><div class="ap-investment-value">$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>` +
                        `</div>` +
                        `<div class="ap-investment-result" style="background:var(--${plBgCls});">` +
                            `<span class="${plCls}">${plSign}$${Math.abs(pl).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${plSign}${plPct.toFixed(1)}%)</span>` +
                        `</div>` +
                        (stockData.targetReturn
                            ? `<div class="ap-target-info">목표 수익률 ${stockData.targetReturn}% (목표가 $${targetPrice.toFixed(2)}) | 남은 거리 ${targetDist > 0 ? '+' : ''}${targetDist}%</div>`
                            : '') +
                    `</div>` +
                `</div>`;
        }

        // Period returns
        const candles = candleCache[symbol] || {};
        const periodSlice = PERIODS.slice(0, 5);
        let periodHTML = '<div class="period-grid">';
        periodSlice.forEach(p => {
            const v = candles[p.days];
            if (v != null) {
                const c = v >= 0 ? 'gain' : 'loss';
                periodHTML += `<div class="period-item"><span class="period-label">${p.label}</span><span class="period-value ${c}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</span></div>`;
            } else {
                periodHTML += `<div class="period-item"><span class="period-label">${p.label}</span><span class="period-value text-tertiary">--</span></div>`;
            }
        });
        periodHTML += '</div>';
        analysisHTML +=
            `<div class="ap-section">` +
                `<div class="ap-section-title">기간별 수익률</div>` +
                periodHTML +
            `</div>`;

        // Buy zones
        if (stockData) {
            const sig = getSignal(stockData, price, cp);
            let zonesHTML = '';
            if (currentTab === 'short' && stockData.targetSell) {
                const tp = price ? ((stockData.targetSell - price) / price * 100).toFixed(1) : 0;
                const sp = price ? ((price - stockData.stopLoss) / price * 100).toFixed(1) : 0;
                zonesHTML =
                    `<div class="zone-item"><span class="text-secondary">목표 $${stockData.targetSell}</span><span class="gain">+${tp}%</span></div>` +
                    `<div class="zone-item"><span class="text-secondary">손절 $${stockData.stopLoss}</span><span class="loss">-${Math.abs(sp)}%</span></div>`;
            } else if (currentTab === 'long' && stockData.buyZones?.length) {
                zonesHTML = stockData.buyZones.map((z, j) => {
                    const zp = price ? ((z - price) / price * 100).toFixed(1) : 0;
                    return `<div class="buy-zone-item"><span>${j + 1}차 $${z}</span><span>${zp > 0 ? '+' : ''}${zp}%</span></div>`;
                }).join('');
            } else if (currentTab === 'watch' && stockData.buyBelow) {
                const bp = price ? ((stockData.buyBelow - price) / price * 100).toFixed(1) : 0;
                zonesHTML = `<div class="zone-item"><span class="text-secondary">매수 목표 $${stockData.buyBelow}</span><span style="color:var(--accent);">${bp > 0 ? '+' : ''}${bp}%</span></div>`;
            }
            if (zonesHTML) {
                analysisHTML +=
                    `<div class="ap-section">` +
                        `<div class="ap-section-title">매매 구간</div>` +
                        zonesHTML +
                    `</div>`;
            }
        }

        // 52-week bar
        const hi = quote.h || 0, lo = quote.l || 0;
        const wp = (hi && lo && hi !== lo) ? ((price - lo) / (hi - lo) * 100) : 50;
        analysisHTML +=
            `<div class="ap-section">` +
                `<div class="week52">` +
                    `<div class="week52-labels"><span>$${lo ? lo.toFixed(0) : '--'}</span><span style="font-size:11px;">52주 범위</span><span>$${hi ? hi.toFixed(0) : '--'}</span></div>` +
                    `<div class="week52-bar"><div class="week52-dot" style="left:calc(${wp}% - 5px);"></div></div>` +
                `</div>` +
            `</div>`;

        // Chart
        analysisHTML +=
            `<div class="ap-section">` +
                `<div class="ap-section-title">캔들 차트</div>` +
                `<div class="chart-container" id="chartContainer"></div>` +
                `<div class="chart-legend">` +
                    `<span><span style="color:#4fc3f7;">\u2501</span> 5일 평균</span>` +
                    `<span><span style="color:#ffa726;">\u2501</span> 20일 평균</span>` +
                    `<span><span style="color:#a29bfe;">\u2501</span> 60일 평균</span>` +
                `</div>` +
            `</div>`;

        // Signal cards (3-column)
        const rsiVal = rsi.length ? rsi[rsi.length - 1] : null;
        const trendInfo = {
            strong_up: { icon: '\ud83d\udfe2', text: '강한 상승', desc: '5일>20일>60일선' },
            up: { icon: '\ud83d\udfe2', text: '상승', desc: '가격이 20일선 위' },
            sideways: { icon: '\ud83d\udfe1', text: '횡보', desc: '방향 불명확' },
            down: { icon: '\ud83d\udd34', text: '하락', desc: '가격이 20일선 아래' },
            strong_down: { icon: '\ud83d\udd34', text: '강한 하락', desc: '5일<20일<60일선' },
            unknown: { icon: '\u2b55', text: '분석 중', desc: '데이터 부족' }
        };
        const ti = trendInfo[trend] || trendInfo.unknown;
        let rsiIcon = '\ud83d\udfe1', rsiText = '보통', rsiDesc = '';
        if (rsiVal != null) {
            if (rsiVal < 30) { rsiIcon = '\ud83d\udfe2'; rsiText = '과매도'; rsiDesc = `RSI ${rsiVal.toFixed(0)} \u2014 반등 가능`; }
            else if (rsiVal > 70) { rsiIcon = '\ud83d\udd34'; rsiText = '과열'; rsiDesc = `RSI ${rsiVal.toFixed(0)} \u2014 조정 주의`; }
            else { rsiDesc = `RSI ${rsiVal.toFixed(0)} \u2014 적정`; }
        }
        const avgVol = raw.v ? raw.v.slice(-20).reduce((a, b) => a + b, 0) / 20 : 0;
        const lastVol = raw.v ? raw.v[raw.v.length - 1] : 0;
        const volRatio = avgVol ? (lastVol / avgVol) : 1;
        let volIcon = '\ud83d\udfe1', volText = '보통', volDesc = `평균 대비 ${(volRatio * 100).toFixed(0)}%`;
        if (volRatio > 1.5) { volIcon = '\ud83d\udfe2'; volText = '활발'; }
        else if (volRatio < 0.5) { volIcon = '\ud83d\udd34'; volText = '한산'; }

        analysisHTML +=
            `<div class="ap-section">` +
                `<div class="ap-section-title">기술 지표</div>` +
                `<div class="signal-cards">` +
                    `<div class="signal-card"><div class="signal-card-label">추세</div><div class="signal-card-icon">${ti.icon}</div><div class="signal-card-value">${ti.text}</div><div class="signal-card-desc">${ti.desc}</div></div>` +
                    `<div class="signal-card"><div class="signal-card-label">과열도</div><div class="signal-card-icon">${rsiIcon}</div><div class="signal-card-value">${rsiText}</div><div class="signal-card-desc">${rsiDesc}</div></div>` +
                    `<div class="signal-card"><div class="signal-card-label">거래량</div><div class="signal-card-icon">${volIcon}</div><div class="signal-card-value">${volText}</div><div class="signal-card-desc">${volDesc}</div></div>` +
                `</div>` +
            `</div>`;

        // Pattern
        if (pattern) {
            const ptColor = (pattern.type === 'bullish' || pattern.type === 'potentially_bullish')
                ? 'var(--color-gain)' : pattern.type === 'bearish' ? 'var(--color-loss)' : 'var(--accent)';
            analysisHTML +=
                `<div class="ap-section">` +
                    `<div class="ap-section-title">차트 패턴</div>` +
                    `<div class="pattern-card"><div class="pattern-name" style="color:${ptColor};">${pattern.name}</div><div class="pattern-desc">${pattern.desc}</div></div>` +
                `</div>`;
        }

        // Cross event
        if (cross) {
            const crossInfo = cross === 'golden'
                ? { color: 'var(--color-gain)', name: '골든크로스 발생', desc: '단기 이동평균(5일)이 장기 이동평균(20일)을 위로 돌파했어요. 상승 추세 전환의 신호로 봐요.' }
                : { color: 'var(--color-loss)', name: '데드크로스 발생', desc: '단기 이동평균(5일)이 장기 이동평균(20일)을 아래로 돌파했어요. 하락 추세 전환의 신호예요.' };
            analysisHTML +=
                `<div class="ap-section">` +
                    `<div class="pattern-card"><div class="pattern-name" style="color:${crossInfo.color};">${crossInfo.name}</div><div class="pattern-desc">${crossInfo.desc}</div></div>` +
                `</div>`;
        }

        // News placeholder + Disclaimer
        analysisHTML +=
            `<div class="ap-section"><div class="ap-section-title">관련 뉴스</div><div id="apNewsList"><div class="news-loading">뉴스 로딩 중...</div></div></div>`;
        analysisHTML +=
            `<div class="disclaimer">\u26a0\ufe0f 이 분석은 AI가 생성한 참고 자료이며, 투자 권유가 아닙니다. 투자 판단의 책임은 본인에게 있습니다.</div>`;

        document.getElementById('apBody').innerHTML = analysisHTML;

        // Create Lightweight Chart
        renderChart(raw, sma5, sma20, sma60);
    } else {
        analysisHTML +=
            `<div class="news-loading" style="color:var(--color-warning);">차트 데이터가 부족해요. 잠시 후 다시 시도해주세요.</div>`;
        analysisHTML +=
            `<div class="ap-section"><div class="ap-section-title">관련 뉴스</div><div id="apNewsList"><div class="news-loading">뉴스 로딩 중...</div></div></div>`;
        analysisHTML +=
            `<div class="disclaimer">\u26a0\ufe0f 이 분석은 참고 자료이며, 투자 권유가 아닙니다.</div>`;
        document.getElementById('apBody').innerHTML = analysisHTML;
    }

    // Fetch news for this ticker
    fetchTickerNews(symbol);
}

export function renderChart(raw, sma5, sma20, sma60) {
    if (currentChart) { currentChart.remove(); setCurrentChart(null); }
    const container = document.getElementById('chartContainer');
    if (!container) return;

    const chart = LightweightCharts.createChart(container, {
        width: container.clientWidth,
        height: 280,
        layout: {
            background: { type: 'solid', color: '#FFFFFF' },
            textColor: '#8B95A1',
            fontFamily: "'Pretendard Variable', sans-serif",
            fontSize: 11
        },
        grid: { vertLines: { color: '#F2F4F6' }, horzLines: { color: '#F2F4F6' } },
        crosshair: { mode: 0 },
        rightPriceScale: { borderColor: '#E5E8EB' },
        timeScale: { borderColor: '#E5E8EB', timeVisible: false },
    });
    setCurrentChart(chart);

    // Candlestick — Korean convention: RED (#EF4452) for up, BLUE (#3182F6) for down
    const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
        upColor: '#EF4452',
        downColor: '#3182F6',
        borderUpColor: '#EF4452',
        borderDownColor: '#3182F6',
        wickUpColor: '#EF4452',
        wickDownColor: '#3182F6',
    });
    const candleData = raw.t.map((t, i) => ({
        time: tsToDate(t), open: raw.o[i], high: raw.h[i], low: raw.l[i], close: raw.c[i]
    }));
    candleSeries.setData(candleData);

    // Volume
    const volSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: '',
    });
    volSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    const volData = raw.t.map((t, i) => ({
        time: tsToDate(t),
        value: raw.v[i],
        color: raw.c[i] >= raw.o[i] ? 'rgba(239,68,82,0.2)' : 'rgba(49,130,246,0.2)',
    }));
    volSeries.setData(volData);

    // SMA lines
    const addSMALine = (smaArr, startIdx, color) => {
        const line = chart.addSeries(LightweightCharts.LineSeries, {
            color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false
        });
        const data = smaArr.map((v, i) => ({ time: tsToDate(raw.t[startIdx + i]), value: v }));
        line.setData(data);
    };
    if (sma5.length) addSMALine(sma5, raw.t.length - sma5.length, '#4fc3f7');
    if (sma20.length) addSMALine(sma20, raw.t.length - sma20.length, '#ffa726');
    if (sma60.length) addSMALine(sma60, raw.t.length - sma60.length, '#a29bfe');

    chart.timeScale().fitContent();

    // Resize observer
    const ro = new ResizeObserver(entries => {
        for (const e of entries) {
            if (currentChart) currentChart.resize(e.contentRect.width, 280);
        }
    });
    ro.observe(container);
}

export function closeAnalysis() {
    document.getElementById('analysisPanel').classList.remove('active');
    document.getElementById('analysisOverlay').classList.remove('active');
    document.body.style.overflow = '';
    if (currentChart) { currentChart.remove(); setCurrentChart(null); }
}

export async function fetchTickerNews(symbol) {
    const kr = STOCK_KR[symbol] || symbol;
    const q = (kr !== symbol ? kr + ' ' : '') + symbol + ' 주가';
    const items = await fetchKoreanNews(q);
    const el = document.getElementById('apNewsList');
    if (!el) return;
    if (items?.length) {
        el.innerHTML = items.slice(0, 6).map(item => {
            const date = item.pubDate ? new Date(item.pubDate).toLocaleDateString('ko-KR') : '';
            return `<div class="ap-news-item" onclick="window.open('${item.link}','_blank')">` +
                `<div class="ap-news-title">${item.title}</div>` +
                `<div class="ap-news-meta"><span>${item.source || ''}</span><span>${date}</span></div>` +
                `</div>`;
        }).join('');
    } else {
        el.innerHTML = '<div class="text-tertiary" style="text-align:center;padding:16px;font-size:13px;">관련 뉴스가 없어요.</div>';
    }
}
