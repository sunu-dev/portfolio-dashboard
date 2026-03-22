// ==========================================
// RENDER — DOM rendering functions
// ==========================================

import { STOCK_KR, MACRO_IND, PRESET_EVENTS } from './config.js';
import {
    currentTab, stocks, macroData, candleCache,
    currentEventId, customEvents, newsCache,
    setCurrentEventId, fmtDate,
    getAllSymbols, eventCache, apiKey
} from './state.js';
import { openAnalysis } from './analysis.js';
import { getSignal, openEditStock, deleteStock } from './ui.js';
import { fetchEventData } from './ui.js';

// --- getAllEvents helper ---
function getAllEvents() {
    return [...PRESET_EVENTS, ...customEvents];
}

// --- RENDER STOCKS as list rows ---
export function renderStocks() {
    const container = document.getElementById('stockGrid');
    const list = stocks[currentTab] || [];
    container.innerHTML = '';

    if (!list.length) {
        container.innerHTML = '<div class="empty-state">종목이 없습니다. 위 검색창에서 추가하세요.</div>';
        return;
    }

    list.forEach((stock, i) => {
        const d = macroData[stock.symbol] || {};
        const price = d.c || 0;
        const change = d.d || 0;
        const cp = d.dp || 0;
        const kr = STOCK_KR[stock.symbol] || '';

        const bc = currentTab === 'short' ? 'badge-short' : currentTab === 'long' ? 'badge-long' : 'badge-watch';
        const bt = currentTab === 'short' ? 'Short' : currentTab === 'long' ? 'Long' : 'Watch';
        const dirClass = change >= 0 ? 'gain' : 'loss';
        const arrow = change >= 0 ? '\u25b2' : '\u25bc';

        const row = document.createElement('div');
        row.className = 'stock-row';
        row.onclick = () => openAnalysis(stock.symbol);

        row.innerHTML =
            `<div class="stock-row-left">` +
                `<span class="stock-row-badge ${bc}">${bt}</span>` +
                `<div>` +
                    `<span class="stock-row-ticker">${stock.symbol}</span>` +
                    `<span class="stock-row-name">${kr}</span>` +
                `</div>` +
            `</div>` +
            `<div class="stock-row-right" style="display:flex;align-items:center;">` +
                `<div>` +
                    `<span class="stock-row-price">$${price ? price.toFixed(2) : '--'}</span>` +
                    `<span class="stock-row-change ${dirClass}">${arrow} ${cp > 0 ? '+' : ''}${cp.toFixed(2)}%</span>` +
                `</div>` +
                `<div class="stock-row-actions">` +
                    `<button class="btn-sm" data-action="edit" title="설정"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>` +
                    `<button class="btn-sm" data-action="delete" title="삭제"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>` +
                `</div>` +
            `</div>`;

        // Attach action handlers via delegation
        row.querySelector('[data-action="edit"]').onclick = (ev) => {
            ev.stopPropagation();
            openEditStock(ev, currentTab, i);
        };
        row.querySelector('[data-action="delete"]').onclick = (ev) => {
            ev.stopPropagation();
            deleteStock(ev, currentTab, i);
        };

        container.appendChild(row);
    });
}

// --- RENDER MACRO ---
export function renderMacro() {
    const strip = document.getElementById('macroStrip');
    strip.innerHTML = '';
    MACRO_IND.forEach(ind => {
        const d = macroData[ind.label] || {};
        const v = d.value;
        const cp = d.changePercent || 0;
        const cls = cp >= 0 ? 'gain' : 'loss';
        const arrow = cp >= 0 ? '\u25b2' : '\u25bc';
        const card = document.createElement('div');
        card.className = 'macro-card';
        card.innerHTML =
            `<div class="macro-label">${ind.label}</div>` +
            `<div class="macro-value">${v != null ? (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v) : '--'}</div>` +
            `<div class="macro-change ${cls}">${arrow} ${Math.abs(cp).toFixed(2)}%</div>`;
        strip.appendChild(card);
    });
}

// --- RENDER NEWS GRID ---
export function renderNewsGrid(items) {
    const grid = document.getElementById('newsGrid');
    grid.innerHTML = '';
    items.slice(0, 15).forEach(item => {
        const date = item.pubDate ? new Date(item.pubDate).toLocaleDateString('ko-KR') : '';
        const tag = getNewsTag(item.title);
        const card = document.createElement('div');
        card.className = 'news-card';
        card.onclick = () => window.open(item.link, '_blank');
        card.innerHTML =
            `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">` +
                `<span class="news-tag" style="background:${tag.bg};color:${tag.color};">${tag.label}</span>` +
                `<span class="news-date">${date}</span>` +
            `</div>` +
            `<div class="news-headline">${item.title}</div>` +
            (item.description ? `<div class="news-summary">${item.description}</div>` : '') +
            (item.source ? `<div class="news-source">${item.source}</div>` : '');
        grid.appendChild(card);
    });
}

// --- RENDER EVENT TABS ---
export function renderEventTabs() {
    const c = document.getElementById('eventTabs');
    c.innerHTML = '';
    getAllEvents().forEach(ev => {
        const btn = document.createElement('button');
        btn.className = `event-tab ${ev.id === currentEventId ? 'active' : ''}`;
        btn.textContent = `${ev.emoji} ${ev.name}`;
        btn.onclick = function () {
            setCurrentEventId(ev.id);
            document.querySelectorAll('.event-tab:not(.add-btn)').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderEventDetail(ev.id);
        };
        c.appendChild(btn);
    });
    const ab = document.createElement('button');
    ab.className = 'event-tab add-btn';
    ab.textContent = '+ 추가';
    ab.onclick = () => document.getElementById('addEventModal').classList.add('active');
    c.appendChild(ab);
}

// --- RENDER EVENT DETAIL ---
export async function renderEventDetail(eventId) {
    const ev = getAllEvents().find(e => e.id === eventId);
    if (!ev) return;
    const detail = document.getElementById('eventDetail');
    const sc = ev.endDate ? 'ended' : 'ongoing';
    const st = ev.endDate ? '종료' : '진행중';
    detail.innerHTML =
        `<div class="event-header"><div class="event-title">${ev.emoji} ${ev.name} <span class="event-status ${sc}">${st}</span></div>` +
        `<div class="event-meta">${fmtDate(ev.startDate)} ~ ${ev.endDate ? fmtDate(ev.endDate) : '현재'}<br>${ev.description}</div></div>` +
        `<div class="news-loading">데이터를 불러오는 중...</div>`;

    await fetchEventData(ev);

    const syms = getAllSymbols();
    let rows = '';
    for (const s of syms) {
        const ed = eventCache[eventId]?.[s];
        const kr = STOCK_KR[s] || '';
        const cprice = macroData[s]?.c;
        if (ed) {
            const cc = cprice ? ((cprice - ed.basePrice) / ed.basePrice * 100) : ed.currentChange;
            const cCls = cc >= 0 ? 'gain' : 'loss';
            const rec = ed.recovered ? `\u2705 ${ed.recoveryDays || ''}일` : (ev.endDate ? '\u274c' : '\u23f3');
            rows +=
                `<tr>` +
                    `<td class="ticker-cell">${s} <span class="text-tertiary" style="font-weight:400;font-size:12px;">${kr}</span></td>` +
                    `<td>$${ed.basePrice.toFixed(2)}</td>` +
                    `<td>${cprice ? '$' + cprice.toFixed(2) : '--'}</td>` +
                    `<td class="loss" style="font-weight:700;">${ed.maxDrop.toFixed(1)}%</td>` +
                    `<td class="${cCls}" style="font-weight:700;">${cc >= 0 ? '+' : ''}${cc.toFixed(1)}%</td>` +
                    `<td>${rec}</td>` +
                `</tr>`;
        } else {
            rows +=
                `<tr><td class="ticker-cell">${s} <span class="text-tertiary" style="font-weight:400;font-size:12px;">${kr}</span></td>` +
                `<td colspan="5" class="text-tertiary" style="font-size:13px;">데이터 없음</td></tr>`;
        }
    }

    detail.innerHTML =
        `<div class="event-header"><div class="event-title">${ev.emoji} ${ev.name} <span class="event-status ${sc}">${st}</span></div>` +
        `<div class="event-meta">${fmtDate(ev.startDate)} ~ ${ev.endDate ? fmtDate(ev.endDate) : '현재'}<br>${ev.description}</div></div>` +
        `<div style="overflow-x:auto;"><table class="event-table"><thead><tr>` +
            `<th>종목</th><th>기준가</th><th>현재가</th><th>최대 하락</th><th>현재 변동</th><th>회복</th>` +
        `</tr></thead><tbody>${rows}</tbody></table></div>` +
        `<div class="event-insight"><strong>초보자를 위한 해석:</strong><br>${ev.insight || '이 기간 동안 종목들이 얼마나 영향을 받았는지 확인해보세요.'}</div>`;
}

// --- NEWS TAG ---
export function getNewsTag(t) {
    t = t.toLowerCase();
    if (t.includes('이란') || t.includes('전쟁') || t.includes('중동'))
        return { label: '전쟁', bg: 'rgba(255,107,107,0.15)', color: '#ff6b6b' };
    if (t.includes('반도체') || t.includes('ai') || t.includes('hbm') || t.includes('엔비디아'))
        return { label: 'AI/반도체', bg: 'rgba(108,92,231,0.15)', color: '#a29bfe' };
    if (t.includes('마이크론') || t.includes('마이크로소프트') || t.includes('브로드컴') || t.includes('아마존'))
        return { label: '보유종목', bg: 'rgba(0,210,160,0.15)', color: '#00d2a0' };
    if (t.includes('나스닥') || t.includes('s&p') || t.includes('증시') || t.includes('연준'))
        return { label: '시장', bg: 'rgba(255,167,38,0.15)', color: '#ffa726' };
    if (t.includes('코스피') || t.includes('코스닥') || t.includes('삼성'))
        return { label: '국장', bg: 'rgba(79,195,247,0.15)', color: '#4fc3f7' };
    return { label: '뉴스', bg: 'rgba(160,160,160,0.12)', color: '#a0a0a0' };
}
