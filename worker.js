let DB_NAMES = {TEMPERATURE: "TEMPERATURE", PRECIPITATION: "PRECIPITATION"};
TABS = {TEMPERATURE: 0, PRECIPITATION: 1};

onmessage = function (e) {
    const activeTab = e.data;
    getDataFromIndexedDB(activeTab);
};

function getDataFromServer(activeTab) {
    if (activeTab === TABS.TEMPERATURE) {
        xhr('get', 'temperature.json', dataLoadedHandler.bind(this, activeTab));
    }
    if (activeTab === TABS.PRECIPITATION) {
        xhr('get', 'precipitation.json', dataLoadedHandler.bind(this, activeTab));
    }
}

function dataLoadedHandler(activeTab, data) {
    const preparedData = prepareDataFromServer(data);
    putDataToIndexedDB(activeTab, preparedData);
    postMessage(preparedData);
}

function getDataFromIndexedDB(activeTab) {
    connectToIndexDB(function (db) {
        const dbName = activeTab === TABS.TEMPERATURE ? DB_NAMES.TEMPERATURE : DB_NAMES.PRECIPITATION;
        const objectStore = db.transaction(dbName, "readonly").objectStore(dbName);
        const data = [];

        objectStore.openCursor().onsuccess = function (event) {
            const cursor = event.target.result;
            if (cursor) {
                data.push({key: cursor.key, value: cursor.value});
                cursor.continue();
            } else {
                if (!data.length) {
                    getDataFromServer(activeTab);
                } else {
                    const preparedData = prepareDataFromIndexedDB(data);
                    postMessage(preparedData);
                }
            }
        };
    });
}

function prepareDataFromServer(data) {
    const parsedData = JSON.parse(data);
    if (!Array.isArray(parsedData)) return {};

    const groupedData = parsedData.reduce(function (result, item) {
        const itemDate = item.t.split('-');
        const itemYear = itemDate[0];
        const itemMonth = itemDate[1];
        const itemValue = item.v;
        if (!result[itemYear]) {
            result[itemYear] = {max: null, min: null, months: {}};
        }
        if (!result[itemYear].months[itemMonth]) {
            result[itemYear].months[itemMonth] = {sumValue: 0, count: 0};
        }
        result[itemYear].months[itemMonth].sumValue += itemValue;
        result[itemYear].months[itemMonth].count++;
        return result;
    }, {});

    for (let year in groupedData) {
        if (!groupedData.hasOwnProperty(year)) continue;
        const yearData = groupedData[year];
        const monthsArray = [];
        for (let month in yearData.months) {
            if (!yearData.months.hasOwnProperty(month)) continue;
            const monthData = yearData.months[month];
            const midValue = Math.round(monthData.sumValue / monthData.count * 100) / 100;
            monthsArray.push({v: midValue, n: month});
            yearData.max = midValue > yearData.max || yearData.max === null ? midValue : yearData.max;
            yearData.min = midValue < yearData.min || yearData.min === null ? midValue : yearData.min;
        }
        yearData.months = monthsArray.sort(monthComparator);
    }
    return groupedData;
}

function monthComparator(first, second) {
    return parseInt(first.n) - parseInt(second.n);
}

function prepareDataFromIndexedDB(data) {
    const preparedData = {};

    for (let i = 0; i < data.length; i++) {
        const dataRow = data[i];
        const itemDate = dataRow.key.split('-');
        const itemYear = itemDate[0];
        const itemValue = dataRow.value;

        if (!preparedData[itemYear]) {
            preparedData[itemYear] = {max: null, min: null, months: []};
        }
        const yearData = preparedData[itemYear];
        yearData.months.push(itemValue);
        yearData.max = itemValue.v > yearData.max || yearData.max === null ? itemValue.v : yearData.max;
        yearData.min = itemValue.v < yearData.min || yearData.min === null ? itemValue.v : yearData.min;
    }

    return preparedData;
}

function putDataToIndexedDB(activeTab, preparedData) {
    connectToIndexDB(function (db) {
        const dbName = activeTab === TABS.TEMPERATURE ? DB_NAMES.TEMPERATURE : DB_NAMES.PRECIPITATION;
        const objectStore = db.transaction(dbName, "readwrite").objectStore(dbName);

        for (let year in preparedData) {
            if (!preparedData.hasOwnProperty(year)) continue;
            const months = preparedData[year].months;

            for (let i = 0; i < months.length; i++) {
                objectStore.put(months[i], year + '-' + months[i].n);
            }
        }
    });
}

function connectToIndexDB(callback) {
    const request = indexedDB.open("ChartDatabase", 3);
    request.onerror = function (err) {
        console.log(err);
    };
    request.onsuccess = function () {
        callback(request.result);
    };
    request.onupgradeneeded = function (e) {
        e.currentTarget.result.createObjectStore(DB_NAMES.TEMPERATURE, {autoIncrement: "true"});
        e.currentTarget.result.createObjectStore(DB_NAMES.PRECIPITATION, {autoIncrement: "true"});
        connectToIndexDB(callback);
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
