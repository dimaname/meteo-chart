let TABS = {TEMPERATURE: 0, PRECIPITATION: 1};

const state = {
    activeTab: TABS.TEMPERATURE,
    temeratureButton: null,
    precipitationButton: null,
    canvasElement: null,
    periodFromElement: null,
    periodToElement: null,
    temeratureData: null,
    precipitationData: null,
    drawWorker: null,
};

function ready() {
    state.temeratureButton = document.getElementById("temperatureBtn");
    state.precipitationButton = document.getElementById("precipitationBtn");
    state.periodFromElement = document.getElementById("periodFrom");
    state.periodToElement = document.getElementById("periodTo");
    state.canvasElement = document.getElementById("chart");
    state.temeratureButton.addEventListener("click", setActiveTab.bind(this, TABS.TEMPERATURE));
    state.precipitationButton.addEventListener("click", setActiveTab.bind(this, TABS.PRECIPITATION));
    state.periodFromElement.addEventListener("change", periodChangeHandler.bind(this));
    state.periodToElement.addEventListener("change", periodChangeHandler.bind(this));
    setPeriodFilters();
    setActiveTab(TABS.TEMPERATURE);
}

function setActiveTab(activeTab) {
    state.activeTab = activeTab;

    if (activeTab === TABS.TEMPERATURE) {
        state.temeratureButton.classList.add("active");
        state.precipitationButton.classList.remove("active");

    } else {
        state.precipitationButton.classList.add("active");
        state.temeratureButton.classList.remove("active");
    }
    getTabData(activeTab);
    redrawCanvas();
}

function setPeriodFilters() {

    for (let i = 1881; i <= 2006; i++) {
        const optionPeriodFrom = document.createElement('option');

        optionPeriodFrom.value = i;
        optionPeriodFrom.innerHTML = i;
        const optionPeriodTo = optionPeriodFrom.cloneNode(true);

        state.periodFromElement.appendChild(optionPeriodFrom);
        state.periodToElement.appendChild(optionPeriodTo);
    }
    state.periodFromElement.options[0].selected = true;
    state.periodToElement.options[state.periodToElement.options.length - 1].selected = true;
}

function periodChangeHandler() {
    const periodFrom = parseInt(state.periodFromElement.value);
    const periodTo = parseInt(state.periodToElement.value);

    for (let i = 0; i < state.periodFromElement.options.length; i++) {
        const option = state.periodFromElement.options[i];
        option.disabled = parseInt(option.value) > periodTo;
    }
    for (let i = 0; i < state.periodToElement.options.length; i++) {
        const option = state.periodToElement.options[i];
        option.disabled = parseInt(option.value) < periodFrom;
    }
    redrawCanvas();
}

function getTabData(activeTab) {
    if (activeTab === TABS.TEMPERATURE && state.temeratureData ||
        activeTab === TABS.PRECIPITATION && state.precipitationData)
        return;

    getDataForChart(activeTab);
}

function getDataOnSuccess(activeTab, dataFromIndexDB) {
    if (activeTab === TABS.TEMPERATURE) {
        state.temeratureData = dataFromIndexDB;

    } else if (activeTab === TABS.PRECIPITATION) {
        state.precipitationData = dataFromIndexDB;
    }
    redrawCanvas();
}

function getDataForChart(activeTab) {
    const worker = new Worker("worker.js");
    worker.onmessage = function (e) {
        getDataOnSuccess(activeTab, e.data);
    };

    worker.postMessage(activeTab);
}

function getCurrentTabData() {
    if (state.activeTab === TABS.TEMPERATURE) {
        return state.temeratureData;
    } else {
        return state.precipitationData;
    }
}

function redrawCanvas() {
    const currentData = getCurrentTabData();
    if (!currentData) return;

    calculateChartPath(currentData, function(chartSvgData){
        drawSvgPaths(chartSvgData);
    });
}

function drawSvgPaths(path) {
    const canvas = state.canvasElement;
    const ctx = canvas.getContext("2d");
    const DOMURL = window.URL || window.webkitURL || window;
    const img = new Image();
    const svg = new Blob([path], {type: 'image/svg+xml'});
    const url = DOMURL.createObjectURL(svg);

    img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);
    };

    img.src = url;
}

function calculateChartPath(data, callback) {
    const canvas = state.canvasElement;

    if(state.drawWorker){
        state.drawWorker.terminate();
    }
    const drawWorker = new Worker("drawWorker.js")
    state.drawWorker = drawWorker;
    drawWorker.onmessage = function (e) {
        state.drawWorker = null;
        callback(e.data);
    };

    drawWorker.postMessage({
        data: data,
        width: canvas.width,
        height: canvas.height,
        periodFrom: state.periodFromElement.value,
        periodTo: state.periodToElement.value
    });
}

document.addEventListener("DOMContentLoaded", ready);