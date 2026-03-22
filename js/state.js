// ==========================================
// STATE — Mutable state & persistence
// ==========================================

import { DEFAULT_STOCKS, STOCK_KR } from './config.js';

// --- Utility functions ---
export function tsToDate(ts) {
    const d = new Date(ts * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtDate(s) {
    const d = new Date(s);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// --- Mutable state ---
export let currentTab = 'short';
export let currentNewsMarket = 'us';
export let currentEventId = 'iran-war';
export let stocks = {};
export let macroData = {};
export let candleCache = {};
export let rawCandles = {};
export let newsCache = {};
export let eventCache = {};
export let customEvents = JSON.parse(localStorage.getItem('customEvents') || '[]');
export let apiKey = localStorage.getItem('finnhub_api_key') || 'd6va409r01qiiutb2g9gd6va409r01qiiutb2ga0';
export let refreshTimer = null;
export let currentChart = null;
export let editingCat = '';
export let editingIdx = -1;

// --- State setters ---
export function setCurrentTab(val) { currentTab = val; }
export function setCurrentNewsMarket(val) { currentNewsMarket = val; }
export function setCurrentEventId(val) { currentEventId = val; }
export function setStocks(val) { stocks = val; }
export function setMacroData(val) { macroData = val; }
export function setRefreshTimer(val) { refreshTimer = val; }
export function setCurrentChart(val) { currentChart = val; }
export function setEditingCat(val) { editingCat = val; }
export function setEditingIdx(val) { editingIdx = val; }
export function setApiKey(val) { apiKey = val; }
export function setCustomEvents(val) { customEvents = val; }

export function updateMacroEntry(key, val) { macroData[key] = val; }
export function updateCandleCache(symbol, val) { candleCache[symbol] = val; }
export function updateRawCandles(symbol, val) { rawCandles[symbol] = val; }
export function updateNewsCache(market, items) { newsCache[market] = items; }
export function updateEventCache(eventId, data) { eventCache[eventId] = data; }
export function updateEventCacheEntry(eventId, symbol, data) {
    if (!eventCache[eventId]) eventCache[eventId] = {};
    eventCache[eventId][symbol] = data;
}

// --- Portfolio persistence ---
export function loadPortfolio() {
    const s = localStorage.getItem('portfolio');
    stocks = s ? JSON.parse(s) : JSON.parse(JSON.stringify(DEFAULT_STOCKS));
    if (!s) savePortfolio();
    // Migrate: add missing fields to existing data
    for (const c in stocks) {
        for (const st of stocks[c]) {
            if (st.avgCost === undefined) st.avgCost = 0;
            if (st.shares === undefined) st.shares = 0;
            if (st.targetReturn === undefined) st.targetReturn = 0;
        }
    }
    savePortfolio();
}

export function savePortfolio() {
    localStorage.setItem('portfolio', JSON.stringify(stocks));
}

export function getAllSymbols() {
    const s = new Set();
    for (const c in stocks) {
        for (const st of stocks[c]) s.add(st.symbol);
    }
    return [...s];
}
