  const TABS = {TEMPERATURE: 0, PRECIPITATION: 1};

  const state = {
  	activeTab: TABS.TEMPERATURE,
  	temeratureButton: null,
  	precipitationButton: null,
  	temeratureData: null,
  	precipitationData: null,

  };

  function ready() {
  	state.temeratureButton = document.getElementById("temeratureBtn");
  	state.precipitationButton = document.getElementById("precipitationBtn");
  	state.temeratureButton.addEventListener("click", setActiveTab.bind(this, TABS.TEMPERATURE));
  	state.precipitationButton.addEventListener("click", setActiveTab.bind(this, TABS.PRECIPITATION));
  	setActiveTab(TABS.TEMPERATURE);
  } 

  function setActiveTab(activeTab) {
  	state.activeTab = activeTab;

	state.temeratureButton.classList.remove("active");
	state.precipitationButton.classList.remove("active");

  	if(activeTab === TABS.TEMPERATURE){
  		state.temeratureButton.classList.add("active");  		
  	}else{
  		state.precipitationButton.classList.add("active");
  	}
  	getTabData(activeTab);
  }


  function getTabData(activeTab){

  	if(activeTab === TABS.TEMPERATURE && !state.temeratureData){
  		xhr('get', 'temperature.json', function(data) {
  			prepareData(data, (preparedData)=>{
  				state.temeratureData = preparedData;
  				redrawCanvas();
  			});
		});
  				
  	}
  	if(activeTab === TABS.PRECIPITATION && !state.precipitationData){
  		xhr('get', 'precipitation.json', function(data) {
  			prepareData(data, (preparedData)=>{
  				state.precipitationData = preparedData;
  				redrawCanvas();
  			});
		});
  	}

  }

function prepareData(rowData, callback){
	
	const myWorker = new Worker("worker.js");
	myWorker.onmessage = (e) =>{
		callback(e.data);
	};
   
	myWorker.postMessage(rowData);
}

function redrawCanvas(){
	
	const canvas = document.getElementById("chart");
	const gr = canvas.getContext("2d");
	 
	const maxCount = 35 + 10;
	const x0 = y0 = 30;
	const width = canvas.width - 80;
	const height = canvas.height - 90;
	const stepY = Math.round(height / maxCount);
	const stepX = Math.round(width / 10);
	
	gr.beginPath();
	//Вертикальная линия
	gr.moveTo(x0, y0);
	gr.lineTo(x0, height + y0);
	//горизонтальная линия
	gr.lineTo(width + x0, height + y0);
	
	var m = 0;
	var x_max = 10;
	//нижняя разметка и цифры
	for (var i = x0; m < x_max; i += stepX) {
	     m ++;
	     gr.moveTo(i, height + y0);
	     gr.lineTo(i, height + y0 + 15);
	     gr.fillText(m, i + 3, height + y0 + 15);
	}
	gr.lineWidth = 2;
	gr.stroke();
	gr.closePath();
}


const xhr = function() {
    const xhr = new XMLHttpRequest();
    return function( method, url, callback ) {
        xhr.onreadystatechange = function() {
            if ( xhr.readyState === 4 ) {
                callback( xhr.responseText );
            }
        };
        xhr.open( method, url );
        xhr.send();
    };
}();

 document.addEventListener("DOMContentLoaded", ready);