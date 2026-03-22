// ==========================================
// API — All network calls
// ==========================================

import { CONFIG, MACRO_IND, PERIODS } from './config.js';
import {
    apiKey, macroData, stocks, candleCache, rawCandles,
    updateMacroEntry, updateCandleCache, updateRawCandles,
    getAllSymbols, delay
} from './state.js';
import { renderStocks, renderMacro } from './render.js';
import { checkAlerts } from './ui.js';

export async function fetchStockData(symbol) {
    try {
        const r = await fetch(`${CONFIG.FINNHUB_BASE}/quote?symbol=${symbol}&token=${apiKey}`);
        return await r.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function fetchCandleDataFull(symbol) {
    const now = Math.floor(Date.now() / 1000);
    const from = now - 400 * 86400;
    try {
        const r = await fetch(`${CONFIG.FINNHUB_BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${now}&token=${apiKey}`);
        const d = await r.json();
        if (d.s === 'ok' && d.c?.length) {
            updateRawCandles(symbol, d);
            const closes = d.c;
            const cp = closes[closes.length - 1];
            const result = {};
            PERIODS.forEach(p => {
                const back = Math.min(Math.round(p.days * 5 / 7), closes.length - 1);
                const idx = Math.max(closes.length - 1 - back, 0);
                result[p.days] = ((cp - Math.max(...closes.slice(idx))) / Math.max(...closes.slice(idx))) * 100;
            });
            updateCandleCache(symbol, result);
        }
    } catch (e) {
        console.error(e);
    }
}

export async function fetchMacroData() {
    const ps = MACRO_IND.filter(i => i.type === 'stock').map(ind =>
        fetchStockData(ind.symbol).then(d => {
            if (d?.c) updateMacroEntry(ind.label, { value: d.c, change: d.d || 0, changePercent: d.dp || 0 });
        })
    );
    await Promise.all(ps);
    try {
        const r = await fetch(`${CONFIG.ER_API_BASE}/latest/USD`);
        const d = await r.json();
        if (d.rates?.KRW) updateMacroEntry('USD/KRW', { value: d.rates.KRW, change: 0, changePercent: 0 });
    } catch (e) { /* silent */ }
    if (!macroData['KOSPI']) updateMacroEntry('KOSPI', { value: null, change: 0, changePercent: 0 });
}

export async function fetchKoreanNews(query) {
    const url = `${CONFIG.RSS2JSON_BASE}?rss_url=${encodeURIComponent('https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=ko&gl=KR&ceid=KR:ko')}&count=15`;
    try {
        const r = await fetch(url);
        const d = await r.json();
        if (d.status === 'ok' && d.items) {
            return d.items.map(i => ({
                title: i.title || '',
                link: i.link || '#',
                pubDate: i.pubDate || '',
                source: i.author || (i.title.match(/ - ([^-]+)$/) || [])[1] || '',
                description: (() => {
                    const div = document.createElement('div');
                    div.innerHTML = i.description || i.content || '';
                    return (div.textContent || '').substring(0, 150).trim();
                })()
            }));
        }
    } catch (e) {
        console.error(e);
    }
    return null;
}

export async function refreshAllData() {
    if (!apiKey) return;
    await fetchMacroData();
    renderMacro();
    const syms = getAllSymbols();
    await Promise.all(syms.map(s =>
        fetchStockData(s).then(d => {
            if (d) {
                updateMacroEntry(s, d);
                for (const c in stocks) {
                    const st = stocks[c].find(x => x.symbol === s);
                    if (st) checkAlerts(st, d);
                }
            }
        })
    ));
    for (const s of syms) {
        await fetchCandleDataFull(s);
        await delay(150);
    }
    renderStocks();
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
