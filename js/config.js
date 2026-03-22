// ==========================================
// CONFIG — All constants
// ==========================================

export const CONFIG = {
    FINNHUB_BASE: 'https://finnhub.io/api/v1',
    ER_API_BASE: 'https://open.er-api.com/v6',
    RSS2JSON_BASE: 'https://api.rss2json.com/v1/api.json',
    REFRESH_INTERVAL: 30000,
    AUTO_REFRESH: true
};

export const STOCK_KR = {
    'MU': '마이크론',
    'MSFT': '마이크로소프트',
    'AVGO': '브로드컴',
    'AMZN': '아마존',
    'AAPL': '애플',
    'GOOGL': '구글',
    'META': '메타',
    'NVDA': '엔비디아',
    'TSLA': '테슬라',
    'AMD': 'AMD',
    'NFLX': '넷플릭스',
    'INTC': '인텔',
    'QCOM': '퀄컴',
    'TSM': 'TSMC',
    'SOXX': '반도체ETF'
};

export const PERIODS = [
    { label: '1일', days: 1 },
    { label: '3일', days: 3 },
    { label: '1주', days: 7 },
    { label: '10일', days: 10 },
    { label: '2주', days: 14 },
    { label: '30일', days: 30 },
    { label: '2개월', days: 60 },
    { label: '3개월', days: 90 },
    { label: '6개월', days: 180 },
    { label: '1년', days: 365 }
];

export const DEFAULT_STOCKS = {
    short: [
        { symbol: 'ASTX', targetSell: 48.93, stopLoss: 37.81, avgCost: 44.48, shares: 470, targetReturn: 10 },
        { symbol: 'BEX', targetSell: 27.28, stopLoss: 21.08, avgCost: 24.80, shares: 840, targetReturn: 10 }
    ],
    long: [
        { symbol: 'MU', buyZones: [430, 404, 380], weight: 40, avgCost: 0, shares: 0, targetReturn: 20 },
        { symbol: 'MSFT', buyZones: [385, 366, 350], weight: 30, avgCost: 0, shares: 0, targetReturn: 15 },
        { symbol: 'AVGO', buyZones: [315, 298, 280], weight: 30, avgCost: 0, shares: 0, targetReturn: 15 }
    ],
    watch: [
        { symbol: 'AMZN', buyBelow: 190, avgCost: 0, shares: 0, targetReturn: 0 }
    ]
};

export const MACRO_IND = [
    { label: 'S&P 500', symbol: '^GSPC', type: 'stock' },
    { label: 'NASDAQ', symbol: '^IXIC', type: 'stock' },
    { label: 'KOSPI', symbol: '^KS11', type: 'kospi' },
    { label: 'USD/KRW', type: 'forex' },
    { label: 'WTI Oil', symbol: 'USOIL', type: 'stock' },
    { label: 'VIX', symbol: '^VIX', type: 'stock' }
];

export const PRESET_EVENTS = [
    {
        id: 'iran-war',
        name: '이란 전쟁',
        emoji: '\u2694\ufe0f',
        startDate: '2026-02-28',
        baseDate: '2026-02-27',
        endDate: null,
        description: '미국-이스라엘 연합 이란 공습. 유가 급등, 글로벌 증시 급락.',
        insight: '전쟁 충격은 보통 1~3개월 내 안정화됩니다. 현재 보유 종목은 10~15% 할인된 상태로, 분쟁 종료 시 강하게 반등할 가능성이 높아요.',
        basePrices: { MU: 487, MSFT: 418, AVGO: 349, AMZN: 223, ASTX: 62.5, BEX: 31.2 },
        baseMacro: { 'S&P 500': 6878.88, NASDAQ: 19850, KOSPI: 7050, 'USD/KRW': 1420, 'WTI Oil': 66.81, VIX: 14.2 }
    },
    {
        id: 'ukraine-war',
        name: '우크라이나 전쟁',
        emoji: '\ud83c\uddfa\ud83c\udde6',
        startDate: '2022-02-24',
        baseDate: '2022-02-23',
        endDate: null,
        description: '러시아 우크라이나 침공. 에너지/곡물 급등.',
        insight: 'S&P 500은 약 -13% 하락 후 6개월 내 회복을 시작했습니다. 반도체 섹터는 공급망 우려로 변동이 컸지만 장기 상승 추세를 유지했어요.',
        basePrices: { MU: 89.16, MSFT: 287.93, AVGO: 571.64, AMZN: 3052.03 },
        baseMacro: { 'S&P 500': 4348.87, NASDAQ: 13716.72, 'USD/KRW': 1199.50, 'WTI Oil': 92.10, VIX: 28.71 },
        precomputed: {
            MU: { maxDrop: -39.2, recovered: true, recoveryDays: 210 },
            MSFT: { maxDrop: -28.5, recovered: true, recoveryDays: 350 },
            AVGO: { maxDrop: -25.3, recovered: true, recoveryDays: 180 },
            AMZN: { maxDrop: -50.2, recovered: false, recoveryDays: null }
        }
    },
    {
        id: 'covid',
        name: '코로나 급락',
        emoji: '\ud83e\udda0',
        startDate: '2020-02-20',
        baseDate: '2020-02-19',
        endDate: '2020-06-08',
        description: 'S&P 500 -34% 급락 후 5개월 만에 회복.',
        insight: '코로나 최저점(3/23)에서 매수한 투자자는 1년 내 +70% 이상 수익을 달성했습니다. 패닉 속 분할 매수 전략이 효과적이었어요.',
        basePrices: { MU: 57.64, MSFT: 187.28, AVGO: 308.96, AMZN: 2170.22 },
        baseMacro: { 'S&P 500': 3373.23, NASDAQ: 9817.18, 'USD/KRW': 1185.50, 'WTI Oil': 53.27, VIX: 14.38 },
        precomputed: {
            MU: { maxDrop: -34.1, recovered: true, recoveryDays: 95 },
            MSFT: { maxDrop: -28.6, recovered: true, recoveryDays: 48 },
            AVGO: { maxDrop: -31.4, recovered: true, recoveryDays: 63 },
            AMZN: { maxDrop: -22.9, recovered: true, recoveryDays: 24 }
        }
    }
];

export const NEWS_QUERIES = {
    us: '미국 증시 나스닥 S&P500 월가 연준',
    kr: '한국 증시 코스피 코스닥 삼성전자',
    hot: '주식 투자 핫이슈 전망 급등'
};
