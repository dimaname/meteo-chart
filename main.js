const TABS = {TEMPERATURE: 0, PRECIPITATION: 1};

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
    state.temeratureButton = document.getElementById("temeratureBtn");
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

    state.temeratureButton.classList.remove("active");
    state.precipitationButton.classList.remove("active");

    if (activeTab === TABS.TEMPERATURE) {
        state.temeratureButton.classList.add("active");
    } else {
        state.precipitationButton.classList.add("active");
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
        if (parseInt(option.value) > periodTo) {
            option.disabled = true;
        } else {
            option.disabled = false;
        }
    }
    for (let i = 0; i < state.periodToElement.options.length; i++) {
        const option = state.periodToElement.options[i];
        if (parseInt(option.value) < periodFrom) {
            option.disabled = true;
        } else {
            option.disabled = false;
        }
    }
    redrawCanvas();
}

function getTabData(activeTab) {

    if (activeTab === TABS.TEMPERATURE && !state.temeratureData) {
        xhr('get', 'temperature.json', function (data) {
            prepareData(data, function(preparedData) {
                state.temeratureData = preparedData;
                redrawCanvas();
            });
        });

    }
    if (activeTab === TABS.PRECIPITATION && !state.precipitationData) {
        xhr('get', 'precipitation.json', function (data) {
            prepareData(data, function(preparedData) {
                state.precipitationData = preparedData;
                redrawCanvas();
            });
        });
    }

}

function prepareData(rowData, callback) {

    const myWorker = new Worker("worker.js");
    myWorker.onmessage = function(e) {
        callback(e.data);
    };

    myWorker.postMessage(rowData);

}

function getMinAndMaxFromPeriod(currentData, periodFrom, periodTo) {
    let min = null, max = null;
    for (let year = periodFrom; year <= periodTo; year++) {
        if (currentData[year]) {
            const yearMax = currentData[year].max;
            const yearMin = currentData[year].min;
            min = min > yearMin || min == null ? yearMin : min;
            max = max < yearMax || max == null ? yearMax : max;
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
    const gr = canvas.getContext("2d");
    gr.clearRect(0, 0, canvas.width, canvas.height);
    const x0 = y0 = 30;
    const width = canvas.width - 80;
    const height = canvas.height - 90;
    const periodFrom = parseInt(state.periodFromElement.value);
    const periodTo = parseInt(state.periodToElement.value);
    const axesPeriodTo = periodTo + 1;
    const periodLength = axesPeriodTo  - periodFrom;

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

    gr.beginPath();
    //вертикальная ось
    gr.moveTo(x0, y0);
    gr.lineTo(x0, height + y0);
    //горизонтальная ось
    gr.lineTo(periodLength * initialStepX + x0 + 1, height + y0);

    //разметка по годам
    for (let i = x0, period = periodFrom; period <= axesPeriodTo; i += stepX, period += stepXiterator) {
        gr.moveTo(i, height + y0);
        gr.lineTo(i, height + y0 + 15);
        gr.fillText(period, i + 3, height + y0 + 15);
    }
    gr.strokeStyle = '#000';
    gr.lineWidth = 2;
    gr.closePath();
    gr.stroke();


    // отрисовка графика
    const monthStep = (initialStepX / 12);
    gr.beginPath();
    for (let year = periodFrom, yearIndex = 0; year < axesPeriodTo; year++, yearIndex++) {
        if (!currentData[year]) return;
        const months = currentData[year].months;
        months.forEach(function(month, i){
            const value = month.v;
            const x = x0 + ( initialStepX * yearIndex + i * monthStep );
            const y = maxValueY + (maxValue - value) * valueMapK;

            if (!yearIndex && !i)
                gr.moveTo(x, y);
            else
                gr.lineTo(x, y);
          //  gr.arc(x, y, 2, 0, 2 * Math.PI, false);
            if (value === minValue || value === maxValue)
                gr.fillText(value, x0 - 25, y);

        });


        gr.strokeStyle = "#ff6129";
        gr.lineWidth = 1;
        gr.stroke();
    }
}

const xhr = function () {
    const xhr = new XMLHttpRequest();
    return function (method, url, callback) {
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                callback(xhr.responseText);
            }
        };
        xhr.open(method, url);
        xhr.send();
    };
}();

document.addEventListener("DOMContentLoaded", ready);