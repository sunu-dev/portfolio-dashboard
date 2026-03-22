// ==========================================
// APP — Entry point
// ==========================================

import { loadPortfolio } from './state.js';
import { refreshAllData } from './api.js';
import { renderStocks, renderEventTabs } from './render.js';
import { openAnalysis, closeAnalysis } from './analysis.js';
import {
    setupEventListeners,
    switchMainTab,
    switchTab,
    switchNewsMarket,
    handleSearch,
    addStock,
    deleteStock,
    openEditStock,
    closeEditStock,
    saveEditStock,
    showAlert,
    startAutoRefresh,
    toggleAutoRefresh,
    updateRefreshInterval,
    updateApiKey,
    clearAllData,
    fetchNewsForMarket,
    saveNewEvent,
    closeAddEventModal
} from './ui.js';

// --- Bind functions to window for onclick handlers in HTML ---
window.switchMainTab = switchMainTab;
window.switchTab = switchTab;
window.switchNewsMarket = switchNewsMarket;
window.openAnalysis = openAnalysis;
window.closeAnalysis = closeAnalysis;
window.openEditStock = openEditStock;
window.closeEditStock = closeEditStock;
window.saveEditStock = saveEditStock;
window.deleteStock = deleteStock;
window.toggleAutoRefresh = toggleAutoRefresh;
window.updateRefreshInterval = updateRefreshInterval;
window.updateApiKey = updateApiKey;
window.clearAllData = clearAllData;
window.saveNewEvent = saveNewEvent;
window.closeAddEventModal = closeAddEventModal;

// --- Init sequence ---
async function init() {
    loadPortfolio();
    renderStocks();
    renderEventTabs();
    await refreshAllData();
    fetchNewsForMarket('us');
    startAutoRefresh();
    setupEventListeners();
}

init();
