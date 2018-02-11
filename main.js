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

    getDataForChart(activeTab, function (data) {
        getDataOnSuccess(activeTab, data);
    });
}

function getDataOnSuccess(activeTab, dataFromIndexDB) {
    if (activeTab === TABS.TEMPERATURE) {
        state.temeratureData = dataFromIndexDB;

    } else if (activeTab === TABS.PRECIPITATION) {
        state.precipitationData = dataFromIndexDB;
    }
    redrawCanvas();
}

function getDataForChart(activeTab, callback) {
    const myWorker = new Worker("worker.js");
    myWorker.onmessage = function (e) {
        callback(e.data);
    };

    myWorker.postMessage(activeTab);
}

function getMinAndMaxFromPeriod(currentData, periodFrom, periodTo) {
    let min = null, max = null;
    for (let year = periodFrom; year <= periodTo; year++) {
        if (currentData[year]) {
            const yearMax = currentData[year].max;
            const yearMin = currentData[year].min;
            min = min > yearMin || min === null ? yearMin : min;
            max = max < yearMax || max === null ? yearMax : max;
        }
    }
    return {minValue: min, maxValue: max};
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
    const canvas = state.canvasElement;
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = .5;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const x0 = y0 = 30;
    const width = canvas.width - 80;
    const height = canvas.height - 90;
    const periodFrom = parseInt(state.periodFromElement.value);
    const periodTo = parseInt(state.periodToElement.value);
    const axesPeriodTo = periodTo + 1;
    const periodLength = axesPeriodTo - periodFrom;

    const minAndMaxValue = getMinAndMaxFromPeriod(currentData, periodFrom, periodTo);
    const minValue = minAndMaxValue.minValue;
    const maxValue = minAndMaxValue.maxValue;
    const minValueY = height + y0 - 20;
    const maxValueY = y0 + 20;
    const valueGraphLength = minValueY - maxValueY;
    const valueLogicLength = maxValue - minValue;
    const valueMapK = valueGraphLength / valueLogicLength;

    // считаем шаг по горизонтале
    const initialStepX = Math.round(width / periodLength);
    let stepXiterator = 1;
    let stepX = initialStepX * stepXiterator;
    while (stepX < 35) {
        stepXiterator++;
        stepX = initialStepX * stepXiterator;
    }

    ctx.beginPath();
    ctx.translate(0, 0);
    //вертикальная ось
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0, height + y0);
    //горизонтальная ось
    ctx.lineTo(periodLength * initialStepX + x0 + 1, height + y0);

    //разметка по годам
    for (let i = x0, period = periodFrom; period <= axesPeriodTo; i += stepX, period += stepXiterator) {
        ctx.moveTo(i, height + y0);
        ctx.lineTo(i, height + y0 + 15);
        ctx.fillText(period, i + 3, height + y0 + 15);
    }
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.closePath();
    ctx.stroke();


    // отрисовка графика
    const monthStep = (initialStepX / 12);
    ctx.translate(0.5, 0.5);
    ctx.beginPath();

    for (let year = periodFrom, yearIndex = 0; year < axesPeriodTo; year++, yearIndex++) {
        if (!currentData[year]) return;
        const months = currentData[year].months;
        months.forEach(function (month, i) {
            const value = month.v;
            const x = x0 + ( initialStepX * yearIndex + i * monthStep );
            const y = maxValueY + (maxValue - value) * valueMapK;

            if (!yearIndex && !i)
                ctx.moveTo(x, y);
            else
                ctx.lineTo(x, y);
            //  ctx.arc(x, y, 2, 0, 2 * Math.PI, false);
            if (value === minValue || value === maxValue)
                ctx.fillText(value, x0 - 30, y);

        });


        ctx.strokeStyle = "#ff6129";
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    ctx.translate(-0.5, -0.5);
}

document.addEventListener("DOMContentLoaded", ready);