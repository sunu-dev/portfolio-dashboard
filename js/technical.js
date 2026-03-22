// ==========================================
// TECHNICAL — Pure analysis (no DOM access)
// ==========================================

export function calcSMA(closes, period) {
    const r = [];
    for (let i = period - 1; i < closes.length; i++) {
        let s = 0;
        for (let j = 0; j < period; j++) s += closes[i - j];
        r.push(s / period);
    }
    return r;
}

export function calcRSI(closes, period = 14) {
    if (closes.length < period + 1) return [];
    let ag = 0, al = 0;
    for (let i = 1; i <= period; i++) {
        const d = closes[i] - closes[i - 1];
        if (d >= 0) ag += d; else al -= d;
    }
    ag /= period;
    al /= period;
    const r = [];
    for (let i = period; i < closes.length; i++) {
        if (i > period) {
            const d = closes[i] - closes[i - 1];
            ag = (ag * (period - 1) + Math.max(d, 0)) / period;
            al = (al * (period - 1) + Math.max(-d, 0)) / period;
        }
        r.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
    }
    return r;
}

export function detectTrend(closes, sma20, sma60) {
    if (!sma20.length || !sma60.length) return 'unknown';
    const p = closes[closes.length - 1];
    const m20 = sma20[sma20.length - 1];
    const m60 = sma60[sma60.length - 1];
    if (p > m20 && m20 > m60) return 'strong_up';
    if (p > m20) return 'up';
    if (p < m20 && m20 < m60) return 'strong_down';
    if (p < m20) return 'down';
    return 'sideways';
}

export function detectCross(sma5, sma20) {
    if (sma5.length < 2 || sma20.length < 2) return null;
    const s5a = sma5[sma5.length - 2], s5b = sma5[sma5.length - 1];
    const s20a = sma20[sma20.length - 2], s20b = sma20[sma20.length - 1];
    if (s5a <= s20a && s5b > s20b) return 'golden';
    if (s5a >= s20a && s5b < s20b) return 'death';
    return null;
}

export function detectPattern(closes) {
    if (closes.length < 40) return null;
    const recent = closes.slice(-60);
    const peaks = [], troughs = [];
    for (let i = 2; i < recent.length - 2; i++) {
        if (recent[i] > recent[i - 1] && recent[i] > recent[i - 2] && recent[i] > recent[i + 1] && recent[i] > recent[i + 2])
            peaks.push({ i, v: recent[i] });
        if (recent[i] < recent[i - 1] && recent[i] < recent[i - 2] && recent[i] < recent[i + 1] && recent[i] < recent[i + 2])
            troughs.push({ i, v: recent[i] });
    }
    if (troughs.length >= 2) {
        const t = troughs.slice(-2);
        if (Math.abs(t[0].v - t[1].v) / t[0].v < 0.03 && t[1].i > t[0].i)
            return { name: '더블바텀 (W자형)', type: 'bullish', desc: '두 번 바닥을 찍고 반등을 시도하는 모양이에요. 보통 상승 전환의 신호로 봐요.' };
    }
    if (peaks.length >= 2 && troughs.length >= 2) {
        const pDown = peaks[peaks.length - 1].v < peaks[0].v;
        const tDown = troughs[troughs.length - 1].v < troughs[0].v;
        if (pDown && tDown)
            return { name: '하락 쐐기형', type: 'potentially_bullish', desc: '가격이 점점 좁아지며 내려가고 있어요. 이 패턴은 반등으로 끝나는 경우가 많아요.' };
        if (pDown && !tDown)
            return { name: '하락 삼각형', type: 'bearish', desc: '고점은 낮아지는데 저점은 유지 중이에요. 지지선 이탈 시 추가 하락 가능성이 있어요.' };
        if (!pDown && tDown)
            return { name: '상승 삼각형', type: 'bullish', desc: '저점이 높아지고 있어요. 저항선을 돌파하면 큰 상승이 올 수 있어요.' };
    }
    // Simple trend
    const first = closes.slice(-30, -20).reduce((a, b) => a + b, 0) / 10;
    const last = closes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    if (last > first * 1.05)
        return { name: '상승 추세', type: 'bullish', desc: '최근 30일간 꾸준히 올라가는 흐름이에요. 상승 추세가 이어질 수 있어요.' };
    if (last < first * 0.95)
        return { name: '하락 추세', type: 'bearish', desc: '최근 30일간 내려가는 흐름이에요. 반등 신호가 나올 때까지 관망이 좋을 수 있어요.' };
    return { name: '횡보 (박스권)', type: 'neutral', desc: '일정 범위 안에서 오르내리고 있어요. 방향이 정해지기 전까지 지켜보세요.' };
}

export function generateSummary(closes, rsi, trend, cross, pattern) {
    const r = rsi.length ? rsi[rsi.length - 1] : 50;
    let cls = 'signal-neutral', icon = '\ud83d\udfe1', label = '관망';

    if (trend === 'strong_up' || (trend === 'up' && r < 70)) { cls = 'signal-positive'; icon = '\ud83d\udfe2'; label = '긍정적'; }
    else if (trend === 'strong_down' || (trend === 'down' && r > 30)) { cls = 'signal-caution'; icon = '\ud83d\udd34'; label = '주의'; }
    if (cross === 'golden') { cls = 'signal-positive'; icon = '\ud83d\udfe2'; label = '긍정적'; }
    if (cross === 'death') { cls = 'signal-caution'; icon = '\ud83d\udd34'; label = '주의'; }
    if (r < 30) { cls = 'signal-positive'; icon = '\ud83d\udfe2'; label = '매수 관점 긍정적'; }
    if (r > 70) { cls = 'signal-caution'; icon = '\ud83d\udd34'; label = '과열 주의'; }

    const trendText = { strong_up: '강한 상승 추세', up: '상승 추세', sideways: '횡보', down: '하락 추세', strong_down: '강한 하락 추세', unknown: '분석 중' };
    let body = `현재 ${trendText[trend] || '분석 중'}이에요. `;
    if (r < 30) body += `RSI가 ${r.toFixed(0)}으로 과매도 구간이에요. 역사적으로 이 수준에서 반등이 자주 나타났어요. `;
    else if (r > 70) body += `RSI가 ${r.toFixed(0)}으로 과열 구간이에요. 단기 조정이 올 수 있어요. `;
    else body += `RSI ${r.toFixed(0)}으로 적정 수준이에요. `;
    if (cross === 'golden') body += '최근 골든크로스(단기선이 장기선을 상향 돌파)가 발생했어요. 상승 신호로 볼 수 있어요.';
    if (cross === 'death') body += '최근 데드크로스(단기선이 장기선을 하향 돌파)가 발생했어요. 추가 하락에 주의하세요.';

    return { cls, icon, label, body };
}
