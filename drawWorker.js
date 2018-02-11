onmessage = function (e) {
    const currentData = e.data.data;
    const canvasWidth = e.data.width;
    const canvasHeight = e.data.height;
    const width = canvasWidth - 80;
    const height = canvasHeight - 90;
    const periodFrom = parseInt(e.data.periodFrom);
    const periodTo = parseInt(e.data.periodTo);
    const x0 = y0 = 30;
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
    const initialStepX = Math.round(width / periodLength);
    const monthStep = (initialStepX / 12);
    let chartPath = '';
    let axesPath = '';
    let chartTexts = [];
    let axesTexts = [];

    let stepXiterator = 1;
    let stepX = initialStepX * stepXiterator;
    while (stepX < 35) {
        stepXiterator++;
        stepX = initialStepX * stepXiterator;
    }

    //вертикальная и горизонтальная оси
    axesPath += "M " + x0 + ' ' + y0 + ' ';
    axesPath += "L " + x0 + ' ' + (height + y0) + ' ';
    axesPath += "L " + (periodLength * initialStepX + x0 + 1) + ' ' + (height + y0) + ' ';

    //разметка по годам
    for (let i = x0, period = periodFrom; period <= axesPeriodTo; i += stepX, period += stepXiterator) {

        axesPath += "M " + i + ' ' + (height + y0) + ' ';
        axesPath += "L " + i + ' ' + (height + y0 + 15) + ' ';
        axesTexts.push({value: period, x:  i + 3, y: height + y0 + 15});
    }

    for (let year = periodFrom, yearIndex = 0; year < axesPeriodTo; year++, yearIndex++) {
        if (!currentData[year]) return;
        const months = currentData[year].months;
        months.forEach(function (month, i) {
            const value = month.v;
            const x = x0 + ( initialStepX * yearIndex + i * monthStep );
            const y = maxValueY + (maxValue - value) * valueMapK;

            if (!yearIndex && !i)
                chartPath += "M " + x + ' ' + y + ' ';
            else {
                chartPath += "L " + x + ' ' + y + ' ';
                chartPath += "L " + x + ' ' + y + ' ';
                //chartPath += 'a 1,1 0 1,0 2,0 ';
                //chartPath += 'a 1,1 0 1,0 -2,0 ';
            }
            if (value === minValue || value === maxValue)
                chartTexts.push({value: value, x: x0 - 5, y: y});
        });
    }

    let chartSvgData = '<svg xmlns="http://www.w3.org/2000/svg" width="' + canvasWidth + '" height="' + canvasHeight + '">' +
        '<path d="' + chartPath + '" fill="transparent" stroke="#ff6129" stroke-width="1.5" shape-rendering="optimizeQuality"  />'+
        '<path d="' + axesPath + '" fill="transparent" stroke="black" stroke-width="2" shape-rendering="optimizeQuality"  />';
    for (let i = 0; i < axesTexts.length; i++) {
        const text = axesTexts[i];
        chartSvgData += '<text x="' + text.x + '" y="' + text.y + '" fill="black" font-size = "12" >' + text.value + '</text>'
    }
    for (let i = 0; i < chartTexts.length; i++) {
        const text = chartTexts[i];
        chartSvgData += '<text x="' + text.x + '" y="' + text.y + '" fill="red" font-size = "10" text-anchor="end">' + text.value + '</text>'
    }
    chartSvgData += '</svg>';
    self.postMessage(chartSvgData);
};

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
