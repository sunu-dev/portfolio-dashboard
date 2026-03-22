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
    // Try rss2json first, fall back to direct RSS parsing via CORS proxy
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;

    // Attempt 1: rss2json
    try {
        const r = await fetch(`${CONFIG.RSS2JSON_BASE}?rss_url=${encodeURIComponent(rssUrl)}`);
        const d = await r.json();
        if (d.status === 'ok' && d.items?.length) {
            return d.items.map(parseNewsItem);
        }
    } catch (e) { /* fall through */ }

    // Attempt 2: Direct fetch + DOMParser (works on same-origin or CORS-allowed)
    try {
        const r = await fetch(rssUrl);
        const text = await r.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');
        if (items.length) {
            return [...items].slice(0, 15).map(item => ({
                title: item.querySelector('title')?.textContent || '',
                link: item.querySelector('link')?.textContent || '#',
                pubDate: item.querySelector('pubDate')?.textContent || '',
                source: (item.querySelector('source')?.textContent) || extractSource(item.querySelector('title')?.textContent || ''),
                description: ''
            }));
        }
    } catch (e) { /* fall through */ }

    // Attempt 3: allorigins CORS proxy
    try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`;
        const r = await fetch(proxyUrl);
        const text = await r.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const items = xml.querySelectorAll('item');
        if (items.length) {
            return [...items].slice(0, 15).map(item => ({
                title: item.querySelector('title')?.textContent || '',
                link: item.querySelector('link')?.textContent || '#',
                pubDate: item.querySelector('pubDate')?.textContent || '',
                source: (item.querySelector('source')?.textContent) || extractSource(item.querySelector('title')?.textContent || ''),
                description: ''
            }));
        }
    } catch (e) {
        console.error('News fetch failed:', e);
    }

    return null;
}

function parseNewsItem(i) {
    return {
        title: i.title || '',
        link: i.link || '#',
        pubDate: i.pubDate || '',
        source: i.author || extractSource(i.title || ''),
        description: (() => {
            const div = document.createElement('div');
            div.innerHTML = i.description || i.content || '';
            return (div.textContent || '').substring(0, 150).trim();
        })()
    };
}

function extractSource(title) {
    const match = title.match(/ - ([^-]+)$/);
    return match ? match[1].trim() : '';
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
