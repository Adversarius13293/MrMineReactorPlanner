/* Toggle between hiding and showing the dropdown on button click. Hides other elements dropdowns. */
function toggleDropdown(elementId) {
		document.getElementById('debug').textContent+= " toggled: " + elementId ;
	var shown = document.getElementById(elementId).classList.contains('show');
	hideDropdowns();
	if(!shown){
		// All dropdowns are allready hidden. Only change something if it needs to be shown.
		document.getElementById(elementId).classList.toggle('show');
	}
}

// Close the dropdown if clicked outside of any cell button.
window.onclick = function(event) {
	if (!event.target.matches('.cell')) {
		hideDropdowns();
	}
}

function hideDropdowns() {
	var dropdowns = document.getElementsByClassName('dropdown-content');
	var i;
	for (var i = 0; i < dropdowns.length; i++) {
		var openDropdown = dropdowns[i];
		if (openDropdown.classList.contains('show')) {
			openDropdown.classList.remove('show');
		}
	}
}

// Set a cells style to a specific style.
function setComponent(forCellId) {
	//function setComponent(forCellId, copyClassFrom) {
		document.getElementById('debug').textContent+= " setComp: " + forCellId ;
	var styleClass = copyClassFrom.className;
	var cell = document.getElementById(forCellId);
	if (!cell.classList.contains(styleClass)) {
		cell.className = "cell " + styleClass;
	}
}


/*
Get all cells, save in list
iterate through them, find fuel rod and bombs
	get neighbours of them out of the list
	if its heat part, add to heat system. remove from list
	

*/
function xy() {
	var cells = document.getElementsByClassName('cell');
	var components = [];
	for(var i = 0; i < cells.length; i++) {
		var comp = createComponentsFromHtml(cells[i]);
		components[components.length] = comp;	
	}
	
	while(components.length > 0) {
		var comp = components[components.length-1];
		components.length -= 1;
		document.getElementById('debug').textContent+= " comp: " + comp;
		if(comp.doesTransferHeat) {
			// TODO: Get everyone of the same heat system.
		}
	}
}

window.onload = function() {	
	var reactorContainerNode = document.getElementById('reactor-container');
	
	for(var i = 0; i < 9; i++) {
		for(var j = 0; j < 9; j++) {
			// Div containing the button.
			var cellContainer = document.createElement('div');
			cellContainer.className = 'cell-container';
			reactorContainerNode.appendChild(cellContainer);
			
			// The button that displays each cell.
			var cellBtn = document.createElement('button');
			cellBtn.className = 'cell component-empty'
			cellBtn.id = i+'_'+j;
			// All this function-ing feels weird, but seems the only way to make it work.
			// https://stackoverflow.com/questions/6048561/setting-onclick-to-use-current-value-of-variable-in-loop
			cellBtn.onclick = function(arg) {
				return function() {
					toggleDropdown(arg);					
				}
			}('dropdown_'+i+'_'+j);
			cellContainer.appendChild(cellBtn);
			
			// Div for the selection dropdown of each cell, hidden by default.
			var dropdown = document.createElement('div');
			dropdown.id = 'dropdown_'+i+'_'+j;
			dropdown.className = 'dropdown-content';
			cellContainer.appendChild(dropdown);
			
			// Dropown options, for each cell.
			// TODO: Reusing just one dropdown div for all buttons would be nice, but I would need to find the current cell button. And have to align the dropdown dynamically.
			addDropdownOptions(dropdown, i+'_'+j);
		}
	}
}

function addDropdownOptions(parentNode, cellId) {
	var componentClasses = getComponentsCss();
	for(var i = 0; i < componentClasses.length; i++){
		var componentBtn = document.createElement('button');
		componentBtn.className = componentClasses[i];
		componentBtn.onclick = function(arg) {
			return function() {
				setComponent(arg);
			}
		}(cellId);
		parentNode.appendChild(componentBtn);
	}
}

function getComponentsCss() {
	// TODO: Dynamically read all '.component-' classes from css file?
	//var sheets = document.styleSheets;
	return ['component-empty','component-fan', 'component-he', 'component-dhe', 'component-qhe'];
}

function createComponentsFromHtml(htmlCell) {
	// Id in format 0_3, for first row 4th colum.
	var position = htmlCell.id.split('_');
	if(htmlCell.classList.contains('component-fan')){
		return new Component('Fan', 0, -12, 0, false, position);
	} else if(htmlCell.classList.contains('component-empty')){
		return new Component('Empty', 0, 0, 0, false, position);
	} else if(htmlCell.classList.contains('component-he')){
		return new Component('Highly Enriched Uranium Fuel Rod', 10, 24, 36000, true, position);
	} else if(htmlCell.classList.contains('component-dhe')){
		return new Component('Dual Highly Enriched Uranium Fuel Rod', 30, 66, 108000, true, position);
	} else if(htmlCell.classList.contains('component-qhe')){
		return new Component('Quad Highly Enriched Uranium Fuel Rod', 90, 180, 324000, true, position);
	} else {
		// Unknwon class?
	}
}

class Component {
	name;
	energyPerSec;
	heat;
	totalEnergy;
//	totalDuration; // Comes from energyPerSec and totalEnergy.
	doesTransferHeat;
	position;
	
	constructor(name, energyPerSec, heat, totalEnergy, doesTransferHeat, position) {
		this.name = name;
		this.energyPerSec = energyPerSec;
		this.heat = heat;
		this.totalEnergy = totalEnergy;
		this.doesTransferHeat = doesTransferHeat;
		this.position = position;
	}
	
	toString() {
		return this.name;
	}
}