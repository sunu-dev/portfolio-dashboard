// ==========================================
// UI — Interaction functions
// ==========================================

import { CONFIG, STOCK_KR, PRESET_EVENTS, NEWS_QUERIES } from './config.js';
import {
    currentTab, currentNewsMarket, currentEventId, stocks,
    macroData, newsCache, eventCache, candleCache,
    customEvents, apiKey, refreshTimer,
    editingCat, editingIdx,
    setCurrentTab, setCurrentNewsMarket, setCurrentEventId,
    setRefreshTimer, setEditingCat, setEditingIdx,
    setApiKey, setCustomEvents,
    savePortfolio, getAllSymbols, delay,
    updateMacroEntry, updateEventCache, updateEventCacheEntry,
    updateNewsCache
} from './state.js';
import { fetchStockData, refreshAllData, fetchKoreanNews } from './api.js';
import { renderStocks, renderNewsGrid, renderEventTabs, renderEventDetail } from './render.js';

// --- getAllEvents helper ---
function getAllEvents() {
    return [...PRESET_EVENTS, ...customEvents];
}

// --- Setup event listeners ---
export function setupEventListeners() {
    document.getElementById('settingsBtn').addEventListener('click', () =>
        document.getElementById('settingsPanel').classList.toggle('active')
    );
    document.getElementById('refreshBtn').addEventListener('click', () => {
        refreshAllData();
        fetchNewsForMarket(currentNewsMarket);
    });
    const si = document.getElementById('searchInput');
    si.addEventListener('input', e => handleSearch(e.target.value));
    si.addEventListener('blur', () =>
        setTimeout(() => document.getElementById('searchResults').classList.remove('active'), 200)
    );
    document.addEventListener('click', e => {
        if (!e.target.closest('#settingsBtn') && !e.target.closest('.settings-panel'))
            document.getElementById('settingsPanel').classList.remove('active');
    });
}

// --- Navigation ---
export function switchMainTab(section, btn) {
    document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(section + 'Section').classList.add('active');
    if (section === 'events') renderEventDetail(currentEventId);
    if (section === 'news' && !newsCache[currentNewsMarket]) fetchNewsForMarket(currentNewsMarket);
}

export function switchTab(tab, btn) {
    setCurrentTab(tab);
    document.querySelectorAll('#categoryTabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderStocks();
}

export function switchNewsMarket(market, btn) {
    setCurrentNewsMarket(market);
    document.querySelectorAll('.news-market-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    newsCache[market] ? renderNewsGrid(newsCache[market]) : fetchNewsForMarket(market);
}

// --- Search ---
export async function handleSearch(q) {
    if (q.length < 1) {
        document.getElementById('searchResults').classList.remove('active');
        return;
    }
    try {
        const r = await fetch(`${CONFIG.FINNHUB_BASE}/search?q=${encodeURIComponent(q)}&token=${apiKey}`);
        const d = await r.json();
        const el = document.getElementById('searchResults');
        el.innerHTML = '';
        if (d.result?.length) {
            d.result.slice(0, 5).forEach(item => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.innerHTML = `<div class="result-symbol">${item.symbol}</div><div class="result-name">${item.description}</div>`;
                div.onclick = () => addStock(item.symbol, item.description);
                el.appendChild(div);
            });
            el.classList.add('active');
        }
    } catch (e) {
        console.error(e);
    }
}

// --- Stock management ---
export function addStock(symbol, name) {
    symbol = symbol.toUpperCase();
    for (const c in stocks) {
        if (stocks[c].some(s => s.symbol === symbol)) {
            alert(`${symbol} 이미 있습니다.`);
            return;
        }
    }
    if (name && !STOCK_KR[symbol]) STOCK_KR[symbol] = name;
    const ns = { symbol, avgCost: 0, shares: 0, targetReturn: 0 };
    if (currentTab === 'short') { ns.targetSell = 0; ns.stopLoss = 0; }
    else if (currentTab === 'long') { ns.buyZones = []; ns.weight = 0; }
    else ns.buyBelow = 0;
    stocks[currentTab].push(ns);
    savePortfolio();
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').classList.remove('active');
    fetchStockData(symbol).then(d => {
        if (d) { updateMacroEntry(symbol, d); renderStocks(); }
    });
}

export function deleteStock(ev, cat, idx) {
    ev.stopPropagation();
    const stock = stocks[cat][idx];
    const kr = STOCK_KR[stock.symbol] || stock.symbol;
    if (!confirm(`${stock.symbol} (${kr})을(를) 삭제할까요?`)) return;
    stocks[cat].splice(idx, 1);
    savePortfolio();
    renderStocks();
}

// --- Edit stock ---
export function openEditStock(ev, cat, idx) {
    ev.stopPropagation();
    setEditingCat(cat);
    setEditingIdx(idx);
    const stock = stocks[cat][idx];
    const kr = STOCK_KR[stock.symbol] || stock.symbol;
    document.getElementById('editStockTitle').textContent = `${stock.symbol} ${kr} 설정`;
    document.getElementById('editAvgCost').value = stock.avgCost || '';
    document.getElementById('editShares').value = stock.shares || '';
    document.getElementById('editTargetReturn').value = stock.targetReturn || '';

    let extraHTML = '';
    if (cat === 'short') {
        extraHTML =
            `<div class="form-group"><label class="form-label">목표가 ($)</label><input type="number" step="0.01" class="form-input" id="editTargetSell" value="${stock.targetSell || ''}"></div>` +
            `<div class="form-group"><label class="form-label">손절가 ($)</label><input type="number" step="0.01" class="form-input" id="editStopLoss" value="${stock.stopLoss || ''}"></div>`;
    } else if (cat === 'long') {
        extraHTML =
            `<div class="form-group"><label class="form-label">매수 구간 (쉼표 구분, 예: 430,404,380)</label><input type="text" class="form-input" id="editBuyZones" value="${(stock.buyZones || []).join(',')}"></div>` +
            `<div class="form-group"><label class="form-label">비중 (%)</label><input type="number" class="form-input" id="editWeight" value="${stock.weight || ''}"></div>`;
    } else {
        extraHTML = `<div class="form-group"><label class="form-label">매수 목표가 ($)</label><input type="number" step="0.01" class="form-input" id="editBuyBelow" value="${stock.buyBelow || ''}"></div>`;
    }
    document.getElementById('editExtraFields').innerHTML = extraHTML;
    document.getElementById('editStockModal').classList.add('active');
}

export function closeEditStock() {
    document.getElementById('editStockModal').classList.remove('active');
}

export function saveEditStock() {
    const stock = stocks[editingCat][editingIdx];
    stock.avgCost = parseFloat(document.getElementById('editAvgCost').value) || 0;
    stock.shares = parseInt(document.getElementById('editShares').value) || 0;
    stock.targetReturn = parseFloat(document.getElementById('editTargetReturn').value) || 0;

    if (editingCat === 'short') {
        stock.targetSell = parseFloat(document.getElementById('editTargetSell')?.value) || 0;
        stock.stopLoss = parseFloat(document.getElementById('editStopLoss')?.value) || 0;
    } else if (editingCat === 'long') {
        const zones = (document.getElementById('editBuyZones')?.value || '').split(',').map(Number).filter(n => n > 0);
        stock.buyZones = zones;
        stock.weight = parseInt(document.getElementById('editWeight')?.value) || 0;
    } else {
        stock.buyBelow = parseFloat(document.getElementById('editBuyBelow')?.value) || 0;
    }

    savePortfolio();
    renderStocks();
    closeEditStock();
}

// --- Beginner status helper ---
export function getSignal(stock, price, cp) {
    if (!price) return { cls: 'signal-neutral', text: '데이터를 불러오는 중이에요...' };
    if (currentTab === 'short') {
        if (stock.stopLoss && price <= stock.stopLoss * 1.03) return { cls: 'signal-caution', text: '\u26a0\ufe0f 손절가에 가까워요. 매도를 고려해보세요.' };
        if (stock.targetSell && price >= stock.targetSell * 0.97) return { cls: 'signal-positive', text: '\ud83c\udfaf 목표가 거의 도달! 수익 실현을 고려해보세요.' };
        if (cp > 2) return { cls: 'signal-positive', text: '\ud83d\udcc8 좋은 흐름이에요. 목표가까지 지켜보세요.' };
        if (cp < -3) return { cls: 'signal-caution', text: '\ud83d\udcc9 많이 빠졌어요. 손절가를 확인하세요.' };
        return { cls: 'signal-neutral', text: '보합 중이에요. 큰 변동 없이 유지되고 있어요.' };
    }
    if (currentTab === 'long') {
        if (stock.buyZones?.length) {
            const near = stock.buyZones.find(z => price <= z * 1.02);
            if (near) return { cls: 'signal-positive', text: `\ud83d\udcb0 매수 구간($${near}) 진입! 분할 매수를 검토해보세요.` };
            const dist = ((stock.buyZones[0] - price) / price * 100).toFixed(1);
            if (dist > 0) return { cls: 'signal-neutral', text: `1차 매수 구간($${stock.buyZones[0]})까지 ${dist}% 남았어요.` };
        }
        return { cls: 'signal-neutral', text: '장기 투자 종목이에요. 여유있게 지켜보세요.' };
    }
    if (stock.buyBelow && price <= stock.buyBelow) return { cls: 'signal-positive', text: `\ud83d\udcb0 목표 매수가($${stock.buyBelow}) 이하! 매수 검토해보세요.` };
    return { cls: 'signal-neutral', text: '관심 종목으로 모니터링 중이에요.' };
}

// --- Alerts ---
export function checkAlerts(stock, d) {
    const p = d.c || 0;
    if (stock.targetSell && p >= stock.targetSell) showAlert(`\ud83c\udfaf ${stock.symbol}: 목표가 도달! $${p.toFixed(2)}`);
    if (stock.stopLoss && p <= stock.stopLoss) showAlert(`\ud83d\udea8 ${stock.symbol}: 손절가 도달! $${p.toFixed(2)}`);
    if (stock.buyBelow && p <= stock.buyBelow) showAlert(`\ud83d\udcb0 ${stock.symbol}: 매수 신호! $${p.toFixed(2)}`);
    if (stock.buyZones) stock.buyZones.forEach(z => {
        if (p <= z * 1.02 && p >= z * 0.98) showAlert(`\ud83d\udcca ${stock.symbol}: 매수 구간 $${z} 근접!`);
    });
}

export function showAlert(msg) {
    const b = document.getElementById('alertBanner');
    document.getElementById('alertText').textContent = msg;
    b.classList.add('active');
    setTimeout(() => b.classList.remove('active'), 4000);
}

// --- Settings ---
export function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    const timer = setInterval(() => { if (CONFIG.AUTO_REFRESH) refreshAllData(); }, CONFIG.REFRESH_INTERVAL);
    setRefreshTimer(timer);
    setInterval(() => { if (CONFIG.AUTO_REFRESH) fetchNewsForMarket(currentNewsMarket); }, 600000);
}

export function toggleAutoRefresh() {
    CONFIG.AUTO_REFRESH = !CONFIG.AUTO_REFRESH;
    document.getElementById('autoRefreshToggle').classList.toggle('active');
}

export function updateRefreshInterval() {
    CONFIG.REFRESH_INTERVAL = parseInt(document.getElementById('refreshInterval').value) * 1000;
    startAutoRefresh();
}

export function updateApiKey() {
    const k = document.getElementById('apiKeyInput').value.trim();
    if (k) {
        localStorage.setItem('finnhub_api_key', k);
        setApiKey(k);
        alert('저장됨');
        document.getElementById('apiKeyInput').value = '';
        refreshAllData();
    }
}

export function clearAllData() {
    if (confirm('전체 초기화할까요?')) {
        localStorage.clear();
        location.reload();
    }
}

// --- News ---
export async function fetchNewsForMarket(market) {
    const grid = document.getElementById('newsGrid');
    grid.innerHTML = '<div class="news-loading">뉴스를 불러오는 중...</div>';
    const q = market === 'my'
        ? getAllSymbols().map(s => STOCK_KR[s] || s).join(' ') + ' 주가'
        : NEWS_QUERIES[market];
    const items = await fetchKoreanNews(q);
    if (items?.length) {
        updateNewsCache(market, items);
        renderNewsGrid(items);
    } else {
        grid.innerHTML = '<div class="news-loading" style="color:var(--color-warning);">뉴스를 불러올 수 없어요.</div>';
    }
}

// --- Events ---
export async function fetchEventData(ev) {
    if (eventCache[ev.id] && Object.keys(eventCache[ev.id]).length) return;
    updateEventCache(ev.id, {});
    const syms = getAllSymbols();
    if (ev.basePrices && Object.keys(ev.basePrices).length) {
        for (const s of syms) {
            const bp = ev.basePrices[s];
            if (!bp) continue;
            const cp = macroData[s]?.c || 0;
            const cc = cp ? ((cp - bp) / bp * 100) : 0;
            const pre = ev.precomputed?.[s];
            if (pre) {
                updateEventCacheEntry(ev.id, s, {
                    basePrice: bp, maxDrop: pre.maxDrop,
                    currentChange: cc || pre.maxDrop * 0.5,
                    recovered: pre.recovered, recoveryDays: pre.recoveryDays
                });
            } else {
                const candle = candleCache[s];
                let md = cc;
                if (candle) { const vals = Object.values(candle).filter(v => v < 0); if (vals.length) md = Math.min(...vals, cc); }
                updateEventCacheEntry(ev.id, s, {
                    basePrice: bp, maxDrop: Math.min(md, 0),
                    currentChange: cc, recovered: cc >= 0, recoveryDays: null
                });
            }
        }
        return;
    }
    const baseTs = Math.floor(new Date(ev.baseDate).getTime() / 1000);
    const endTs = ev.endDate ? Math.floor(new Date(ev.endDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
    for (const s of syms) {
        try {
            const r = await fetch(`${CONFIG.FINNHUB_BASE}/stock/candle?symbol=${s}&resolution=D&from=${baseTs}&to=${endTs}&token=${apiKey}`);
            const d = await r.json();
            if (d.s === 'ok' && d.c?.length > 1) {
                const bp = d.c[0], low = Math.min(...d.c), last = d.c[d.c.length - 1];
                const ri = d.c.findIndex((c, i) => i > d.c.indexOf(low) && c >= bp);
                updateEventCacheEntry(ev.id, s, {
                    basePrice: bp, maxDrop: ((low - bp) / bp * 100),
                    currentChange: ((last - bp) / bp * 100),
                    recovered: ri !== -1, recoveryDays: ri !== -1 ? ri : null
                });
            }
            await delay(200);
        } catch (e) {
            console.error(e);
        }
    }
}

export function saveNewEvent() {
    const name = document.getElementById('eventName').value.trim();
    const sd = document.getElementById('eventStartDate').value;
    if (!name || !sd) { alert('이름과 시작일은 필수입니다.'); return; }
    const start = new Date(sd);
    start.setDate(start.getDate() - 1);
    const ne = {
        id: 'c-' + Date.now(),
        name,
        emoji: '\ud83d\udccc',
        startDate: sd,
        baseDate: start.toISOString().split('T')[0],
        endDate: document.getElementById('eventEndDate').value || null,
        description: document.getElementById('eventDesc').value.trim() || name,
        insight: '',
        basePrices: {},
        baseMacro: {}
    };
    const updated = [...customEvents, ne];
    setCustomEvents(updated);
    localStorage.setItem('customEvents', JSON.stringify(updated));
    setCurrentEventId(ne.id);
    renderEventTabs();
    renderEventDetail(ne.id);
    closeAddEventModal();
}

export function closeAddEventModal() {
    document.getElementById('addEventModal').classList.remove('active');
}
