onmessage = function (e) {
    const parsedData = JSON.parse(e.data);
    const preparedData = groupByMonths(parsedData);

    postMessage(preparedData);
}


function groupByMonths(data) {
    if (!Array.isArray(data)) return {};

    const groupedData = data.reduce(function (result, item){
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
            const midValue = Math.round(monthData.sumValue / monthData.count);
            monthsArray.push( {v: midValue, n:month} );
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