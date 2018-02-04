

onmessage = function(e) {
	const parsedData = JSON.parse(e.data);
  	const preparedData = groupByMonths(parsedData);

  	postMessage(preparedData);
}


function groupByMonths(data){
	if(!Array.isArray(data)) return {};

	const groupedData = data.reduce( (result, item) => {
		const itemDate = item.t.split('-');	
		const itemYear = itemDate[0];	
		const itemMonth = itemDate[1];	
		const itemValue = item.v;	
		if(!result[itemYear]){
			result[itemYear] = { max: null, min: null, months: {} };
		}	
		if(!result[itemYear][itemMonth]){
			result[itemYear].months[itemMonth] = {sumValue: 0, count: 0 };
		}
		result[itemYear].months[itemMonth].sumValue += itemValue;
		result[itemYear].months[itemMonth].count ++;
		return result;
	}, {});

	for (let year in groupedData) {
		if (!groupedData.hasOwnProperty(year) ) continue;
		const yearData = groupedData[year];
		for (let month in yearData.months) {
		    if (!yearData.months.hasOwnProperty(month) ) continue;	  
		    const monthData = yearData.months[month];
		    const midValue = monthData.sumValue / monthData.count;
		    yearData.months[month] = { v : midValue};
		    yearData.max = midValue > yearData.max ? midValue : yearData.max;
		    yearData.min = midValue < yearData.min ? midValue : yearData.min;
	    }
	}
	return groupedData;
}