// COO TRENDS VIEW - Chart.js trend analysis charts with predictive analytics

let refreshInterval = null;
let selectedTimeWindow = 'shift'; // Default: shift (8h)

// Existing charts
let oeeChart = null;
let wasteChart = null;
let equipmentChart = null;

// Predictive charts
let downtimeParetoChart = null;
let wastePredictiveChart = null;
let oeeComponentsChart = null;

// Map of canvas IDs to their parent container
const CHART_CONTAINERS = {
    'coo-oee-chart': null,
    'coo-waste-chart': null,
    'coo-equipment-chart': null,
    'coo-downtime-pareto-chart': null,
    'coo-waste-predictive-chart': null,
    'coo-oee-components-chart': null
};

const CHART_COLORS = {
    cyan: '#00ffff',
    green: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    purple: '#a78bfa',
    blue: '#3b82f6',
    pink: '#ec4899'
};

const DARK_THEME = {
    gridColor: 'rgba(255, 255, 255, 0.1)',
    tickColor: '#e8e8e8',
    backgroundColor: 'transparent'
};

/**
 * Destroy a chart instance safely
 */
function destroyChart(chart) {
    if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
    }
    return null;
}

/**
 * Set loading state on a chart container
 */
function setLoading(canvasId, loading) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.closest('.trend-chart-container');
    if (!container) return;
    container.classList.toggle('chart-loading', loading);
    // Remove any existing empty-state when starting to load
    if (loading) {
        const empty = container.querySelector('.chart-empty-state');
        if (empty) empty.remove();
    }
}

/**
 * Show an empty state message on a chart container
 */
function showEmptyState(canvasId, message = 'No data available for this time window') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.closest('.trend-chart-container');
    if (!container) return;
    // Remove existing empty state
    const existing = container.querySelector('.chart-empty-state');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'chart-empty-state';
    el.textContent = message;
    container.appendChild(el);
}

/**
 * Set all chart containers to loading state
 */
function setAllLoading(loading) {
    for (const id of Object.keys(CHART_CONTAINERS)) {
        setLoading(id, loading);
    }
}

/**
 * Create OEE by Enterprise bar chart
 */
function createOEEChart(data) {
    oeeChart = destroyChart(oeeChart);
    const canvasId = 'coo-oee-chart';
    setLoading(canvasId, false);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const oeeData = data?.data || {};
    const enterprises = Object.keys(oeeData);
    if (enterprises.length === 0) {
        showEmptyState(canvasId);
        return;
    }

    const ctx = canvas.getContext('2d');
    const values = enterprises.map(e => oeeData[e]?.oee || 0);
    const colors = values.map(v => {
        if (v >= 85) return CHART_COLORS.green;
        if (v >= 70) return CHART_COLORS.amber;
        return CHART_COLORS.red;
    });

    oeeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: enterprises.map(e => e.replace('Enterprise ', 'Ent. ')),
            datasets: [{
                label: 'OEE %',
                data: values,
                backgroundColor: colors.map(c => c + '99'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `OEE: ${ctx.parsed.y.toFixed(1)}%`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: DARK_THEME.gridColor },
                    ticks: {
                        color: DARK_THEME.tickColor,
                        callback: (v) => v + '%'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: DARK_THEME.tickColor }
                }
            }
        }
    });
}

/**
 * Create Waste trends bar chart
 */
function createWasteChart(data) {
    wasteChart = destroyChart(wasteChart);
    const canvasId = 'coo-waste-chart';
    setLoading(canvasId, false);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const summary = data?.summary || {};
    const enterprises = Object.keys(summary);
    if (enterprises.length === 0) {
        showEmptyState(canvasId);
        return;
    }

    const ctx = canvas.getContext('2d');
    const totals = enterprises.map(e => summary[e]?.total || 0);
    const trends = enterprises.map(e => summary[e]?.trend || 'stable');

    const barColors = trends.map(t => {
        if (t === 'rising') return CHART_COLORS.red;
        if (t === 'falling') return CHART_COLORS.green;
        return CHART_COLORS.amber;
    });

    wasteChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: enterprises.map(e => e.replace('Enterprise ', 'Ent. ')),
            datasets: [{
                label: 'Total Waste (24h)',
                data: totals,
                backgroundColor: barColors.map(c => c + '99'),
                borderColor: barColors,
                borderWidth: 2,
                borderRadius: 6,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            const trend = trends[idx] || 'stable';
                            const arrow = trend === 'rising' ? ' (rising)' : trend === 'falling' ? ' (falling)' : '';
                            return `Waste: ${ctx.parsed.y.toFixed(1)}${arrow}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: DARK_THEME.gridColor },
                    ticks: { color: DARK_THEME.tickColor }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: DARK_THEME.tickColor }
                }
            }
        }
    });
}

/**
 * Create Equipment state doughnut chart
 */
function createEquipmentChart(data) {
    equipmentChart = destroyChart(equipmentChart);
    const canvasId = 'coo-equipment-chart';
    setLoading(canvasId, false);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const summary = data?.summary || { running: 0, idle: 0, down: 0, unknown: 0 };
    const labels = ['Running', 'Idle', 'Down', 'Unknown'];
    const values = [summary.running || 0, summary.idle || 0, summary.down || 0, summary.unknown || 0];
    const colors = [CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.red, '#666666'];

    // Filter out zero values for cleaner display
    const filteredLabels = [];
    const filteredValues = [];
    const filteredColors = [];
    labels.forEach((label, i) => {
        if (values[i] > 0) {
            filteredLabels.push(label);
            filteredValues.push(values[i]);
            filteredColors.push(colors[i]);
        }
    });

    // If all zero, show placeholder
    if (filteredValues.length === 0) {
        filteredLabels.push('No Data');
        filteredValues.push(1);
        filteredColors.push('#333333');
    }

    equipmentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: filteredLabels,
            datasets: [{
                data: filteredValues,
                backgroundColor: filteredColors.map(c => c + 'cc'),
                borderColor: filteredColors,
                borderWidth: 2,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: DARK_THEME.tickColor,
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return `${ctx.label}: ${ctx.parsed} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create downtime Pareto horizontal bar chart
 */
function createDowntimeParetoChart(data) {
    downtimeParetoChart = destroyChart(downtimeParetoChart);
    const canvasId = 'coo-downtime-pareto-chart';
    setLoading(canvasId, false);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const paretoData = data?.paretoData || [];
    if (paretoData.length === 0) {
        showEmptyState(canvasId, 'No downtime events recorded for this time window');
        return;
    }

    const ctx = canvas.getContext('2d');
    const topN = paretoData.slice(0, 10);
    const labels = topN.map(d => `${d.machine} (${d.site})`);
    const values = topN.map(d => d.downtimeMinutes);
    const percentages = topN.map(d => d.percentOfTotal);

    downtimeParetoChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Downtime (minutes)',
                data: values,
                backgroundColor: values.map((v, i) => {
                    if (i === 0) return CHART_COLORS.red + '99';
                    if (i < 3) return CHART_COLORS.amber + '99';
                    return CHART_COLORS.cyan + '99';
                }),
                borderColor: values.map((v, i) => {
                    if (i === 0) return CHART_COLORS.red;
                    if (i < 3) return CHART_COLORS.amber;
                    return CHART_COLORS.cyan;
                }),
                borderWidth: 2,
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const idx = ctx.dataIndex;
                            return [
                                `Downtime: ${ctx.parsed.x} minutes`,
                                `Percent of Total: ${percentages[idx].toFixed(1)}%`,
                                `Incidents: ${topN[idx].incidentCount}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: DARK_THEME.gridColor },
                    ticks: {
                        color: DARK_THEME.tickColor,
                        callback: (v) => v + ' min'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: DARK_THEME.tickColor, font: { size: 10 } }
                }
            }
        }
    });
}

/**
 * Check if predictive data has any actual data points
 */
function hasTimeSeriesData(byEnterprise) {
    return Object.values(byEnterprise).some(ent =>
        ent.historical && ent.historical.length > 0
    );
}

/**
 * Create waste predictive line chart with forecast
 */
function createWastePredictiveChart(data) {
    wastePredictiveChart = destroyChart(wastePredictiveChart);
    const canvasId = 'coo-waste-predictive-chart';
    setLoading(canvasId, false);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const byEnterprise = data?.byEnterprise || {};
    if (!hasTimeSeriesData(byEnterprise)) {
        showEmptyState(canvasId, 'No waste data available for predictions');
        const alertContainer = document.getElementById('waste-prediction-alerts');
        if (alertContainer) alertContainer.innerHTML = '';
        return;
    }

    const ctx = canvas.getContext('2d');
    const datasets = Object.entries(byEnterprise).flatMap(([enterprise, entData], idx) => {
        const colors = [CHART_COLORS.cyan, CHART_COLORS.green, CHART_COLORS.amber];
        const historicalData = (entData.historical || []).map(d => ({
            x: new Date(d.timestamp),
            y: d.value
        }));
        const predictionData = (entData.prediction || []).map(d => ({
            x: new Date(d.timestamp),
            y: d.value
        }));

        return [
            {
                label: `${enterprise.replace('Enterprise ', 'Ent. ')} - Historical`,
                data: historicalData,
                borderColor: colors[idx % colors.length],
                borderWidth: 2,
                pointRadius: 2,
                fill: false,
                tension: 0.1
            },
            {
                label: `${enterprise.replace('Enterprise ', 'Ent. ')} - Predicted`,
                data: predictionData,
                borderColor: colors[idx % colors.length],
                borderWidth: 2,
                borderDash: [8, 4],
                pointRadius: 4,
                pointStyle: 'triangle',
                fill: false
            }
        ];
    });

    wastePredictiveChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: DARK_THEME.tickColor,
                        padding: 8,
                        font: { size: 10 },
                        usePointStyle: true
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: selectedTimeWindow === 'hourly' ? 'minute' :
                              selectedTimeWindow === 'shift' ? 'hour' :
                              selectedTimeWindow === 'daily' ? 'hour' : 'day'
                    },
                    grid: { color: DARK_THEME.gridColor },
                    ticks: { color: DARK_THEME.tickColor }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: DARK_THEME.gridColor },
                    ticks: {
                        color: DARK_THEME.tickColor,
                        callback: (v) => v + ' units'
                    }
                }
            }
        }
    });

    // Render alert banner
    renderAlertBanner(byEnterprise);
}

/**
 * Create OEE components predictive chart (multi-line)
 */
function createOEEComponentsChart(data) {
    oeeComponentsChart = destroyChart(oeeComponentsChart);
    const canvasId = 'coo-oee-components-chart';
    setLoading(canvasId, false);

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const components = ['availability', 'performance', 'quality'];
    const hasData = components.some(c => data?.[c]?.historical?.length > 0);
    if (!hasData) {
        showEmptyState(canvasId, 'No OEE component data available for predictions');
        return;
    }

    const ctx = canvas.getContext('2d');
    const colors = {
        availability: CHART_COLORS.green,
        performance: CHART_COLORS.blue,
        quality: CHART_COLORS.amber
    };

    const datasets = components.flatMap(component => {
        const compData = data[component];
        if (!compData || !compData.historical || compData.historical.length === 0) return [];

        const historical = compData.historical.map(d => ({
            x: new Date(d.timestamp),
            y: d.value
        }));
        const prediction = (compData.prediction || []).map(d => ({
            x: new Date(d.timestamp),
            y: d.value
        }));

        return [
            {
                label: `${component.charAt(0).toUpperCase() + component.slice(1)} - Historical`,
                data: historical,
                borderColor: colors[component],
                borderWidth: 2,
                pointRadius: 2,
                fill: false,
                tension: 0.1
            },
            {
                label: `${component.charAt(0).toUpperCase() + component.slice(1)} - Predicted`,
                data: prediction,
                borderColor: colors[component],
                borderWidth: 2,
                borderDash: [8, 4],
                pointRadius: 4,
                pointStyle: 'triangle',
                fill: false
            }
        ];
    });

    oeeComponentsChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: DARK_THEME.tickColor,
                        padding: 8,
                        font: { size: 10 },
                        usePointStyle: true
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: selectedTimeWindow === 'hourly' ? 'minute' :
                              selectedTimeWindow === 'shift' ? 'hour' :
                              selectedTimeWindow === 'daily' ? 'hour' : 'day'
                    },
                    grid: { color: DARK_THEME.gridColor },
                    ticks: { color: DARK_THEME.tickColor }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: DARK_THEME.gridColor },
                    ticks: {
                        color: DARK_THEME.tickColor,
                        callback: (v) => v + '%'
                    }
                }
            }
        }
    });
}

/**
 * Render alert banner for predictions exceeding thresholds
 */
function renderAlertBanner(enterpriseData) {
    const alertContainer = document.getElementById('waste-prediction-alerts');
    if (!alertContainer) return;

    const alerts = Object.entries(enterpriseData)
        .filter(([_, data]) => data.alert)
        .map(([enterprise, data]) => ({
            enterprise,
            ...data.alert
        }));

    if (alerts.length === 0) {
        alertContainer.innerHTML = '<div class="prediction-status-good">All waste predictions within normal range</div>';
        return;
    }

    alertContainer.innerHTML = alerts.map(alert => `
        <div class="prediction-alert ${alert.severity}">
            <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span><strong>${alert.enterprise}:</strong> ${alert.message}</span>
        </div>
    `).join('');
}

/**
 * Handle time window selection
 */
window.selectTimeWindow = function(win) {
    selectedTimeWindow = win;

    // Update UI
    document.querySelectorAll('.window-btn').forEach(btn => {
        const btnText = btn.textContent.toLowerCase();
        const isActive = (win === 'hourly' && btnText.includes('hourly')) ||
                         (win === 'shift' && btnText.includes('shift')) ||
                         (win === 'daily' && btnText.includes('daily')) ||
                         (win === 'weekly' && btnText.includes('weekly'));
        btn.classList.toggle('active', isActive);
    });

    // Refresh data with new window
    fetchAndRender();
};

/**
 * Safely fetch JSON from an endpoint
 */
async function safeFetch(url, label) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${label}: ${res.status}`);
        return await res.json();
    } catch (error) {
        console.error(`COO trends - ${label} error:`, error);
        return null;
    }
}

/**
 * Fetch all data and create/update charts
 */
async function fetchAndRender() {
    // Show loading state on all charts
    setAllLoading(true);

    // Fetch all data in parallel - each request is independent
    const [oeeData, wasteData, equipData, downtimeData, wastePredData, oeePredData] = await Promise.all([
        safeFetch('/api/oee/breakdown', 'OEE breakdown'),
        safeFetch('/api/waste/trends', 'Waste trends'),
        safeFetch('/api/equipment/states', 'Equipment states'),
        safeFetch(`/api/trends/downtime-pareto?window=${selectedTimeWindow}&enterprise=ALL`, 'Downtime Pareto'),
        safeFetch(`/api/trends/waste-predictive?window=${selectedTimeWindow}&enterprise=ALL`, 'Waste predictive'),
        safeFetch(`/api/trends/oee-components?window=${selectedTimeWindow}&enterprise=ALL`, 'OEE components')
    ]);

    // Create each chart independently - failures don't block others
    // Each create function clears its own loading state
    if (oeeData) createOEEChart(oeeData);
    else { setLoading('coo-oee-chart', false); showEmptyState('coo-oee-chart'); }

    if (wasteData) createWasteChart(wasteData);
    else { setLoading('coo-waste-chart', false); showEmptyState('coo-waste-chart'); }

    if (equipData) createEquipmentChart(equipData);
    else { setLoading('coo-equipment-chart', false); showEmptyState('coo-equipment-chart'); }

    if (downtimeData) createDowntimeParetoChart(downtimeData);
    else { setLoading('coo-downtime-pareto-chart', false); showEmptyState('coo-downtime-pareto-chart', 'No downtime events recorded for this time window'); }

    if (wastePredData) createWastePredictiveChart(wastePredData);
    else { setLoading('coo-waste-predictive-chart', false); showEmptyState('coo-waste-predictive-chart', 'No waste data available for predictions'); }

    if (oeePredData) createOEEComponentsChart(oeePredData);
    else { setLoading('coo-oee-components-chart', false); showEmptyState('coo-oee-components-chart', 'No OEE component data available for predictions'); }
}

/**
 * Initialize the trends view
 */
export async function init() {
    await fetchAndRender();
    refreshInterval = setInterval(fetchAndRender, 30000);
}

/**
 * Cleanup the trends view
 */
export function cleanup() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    // Destroy existing charts
    oeeChart = destroyChart(oeeChart);
    wasteChart = destroyChart(wasteChart);
    equipmentChart = destroyChart(equipmentChart);

    // Destroy predictive charts
    downtimeParetoChart = destroyChart(downtimeParetoChart);
    wastePredictiveChart = destroyChart(wastePredictiveChart);
    oeeComponentsChart = destroyChart(oeeComponentsChart);
}
