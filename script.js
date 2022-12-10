/**
* Toggle between hiding and showing the dropdown on button click. Hides other cells dropdowns.
*/
function toggleDropdown(elementId) {
	var shown = document.getElementById(elementId).classList.contains('show');
	hideDropdowns();
	if(!shown){
		// All dropdowns are allready hidden. Only change something if it needs to be shown.
		document.getElementById(elementId).classList.toggle('show');
	}
}

/**
* Close the dropdown if clicked outside of any cell button.
*/
window.onclick = function(event) {
	if (!event.target.matches('.cell')) {
		hideDropdowns();
	}
}
/**
* Hide every dropdown menu.
*/
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

/** 
* Set a cells style to a specific elements style, in addition to the default cell style.
*/
function setComponent(forCellId, copyClassFrom) {
	var styleClass = copyClassFrom.className;
	var cell = document.getElementById(forCellId);
	if (!cell.classList.contains(styleClass)) {
		cell.className = "cell " + styleClass;
	}
	updateReactorStats();
}


/*
Get all cells, save in list
iterate through them, find fuel rod and bombs
	get neighbours of them out of the list
	if its heat part, add to heat system. remove from list
*/
function updateReactorStats() {
	var cells = document.getElementsByClassName('cell');
	var components = [];
	for(var i = 0; i < cells.length; i++) {
		var comp = createComponentsFromHtml(cells[i]);
		components[components.length] = comp;	
	}
	
	var warningEnergy;
	var warningHeat;
	var energyPerSecond = 0;
	var energyTotal = 0;
	var heatDiff = 0;
	
	// TODO:
	// Process buffs first.
	
	// Then need to process heat transfering elements. To not mark a non transfering heat
	// component as processed, which then later can't be included in a heat system anymore.
	for(var i = 0; i < components.length; i++) {
		var comp = components[i];
		if(comp.isProcessed || !comp.doesTransferHeat){
			continue;
		}
		comp.isProcessed = true;
		
		var currentHeatSystem = [];		
		currentHeatSystem[0] = comp;
		
		getHeatSystemMembers(comp, components, currentHeatSystem);
		// TODO: Test for energy and heat limits.
		var systemHeat = 0;
		for(var j = 0; j < currentHeatSystem.length; j++) {
			comp = currentHeatSystem[j];
			energyPerSecond += comp.energyPerSec;
			energyTotal += comp.totalEnergy;
			heatDiff += comp.heat;
		}
		//document.getElementById('debug').textContent+= " heat System size: " + currentHeatSystem.length;
	}
	
	document.getElementById('feedback_eps').textContent = energyPerSecond;
	document.getElementById('feedback_etotal').textContent = energyTotal;
	document.getElementById('feedback_hdiff').textContent = heatDiff;
}

function getHeatSystemMembers(currentComponent, remainingComponents, members) {
	for(var i = 0; i < remainingComponents.length; i++) {
		var comp = remainingComponents[i];
		if(comp.isProcessed){
			continue;
		}
		var diffX = Math.abs(comp.position[0] - currentComponent.position[0]);
		var diffY = Math.abs(comp.position[1] - currentComponent.position[1]);
		// Only one step in only one direction, so it is a neighbour.
		if(diffX + diffY == 1) {
			comp.isProcessed = true;
			if(comp.heat != 0 || comp.doesTransferHeat) {
				members[members.length] = comp;
			}
			// If it does transfer heat, check its neighbours. Currently only excludes fans.
			if(comp.doesTransferHeat) {
				getHeatSystemMembers(comp, remainingComponents, members);
			}
		}
	}
}
/**
* Fill the reactor container with all the cell buttons and a dropdown menu for every button.
*/
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
		componentBtn.onclick = function(arg, arg2) {
			return function() {
				setComponent(arg, arg2);
			}
		}(cellId, componentBtn);
		parentNode.appendChild(componentBtn);
	}
}

/**
* Get all possible reactor component css classes.
*/
function getComponentsCss() {
	// TODO: Dynamically read all '.component-' classes from css file?
	//var sheets = document.styleSheets;
	return ['component-empty','component-fan', 'component-he', 'component-dhe', 'component-qhe', 'component-duct', 'component-cb1'];
}

function createComponentsFromHtml(htmlCell) {
	// Id in format 0_3, for first row 4th colum.
	var position = htmlCell.id.split('_');
	if(htmlCell.classList.contains('component-fan')){
		return new Component('Fan', 0, -12, 0, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-empty')){
		return new Component('Empty', 0, 0, 0, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-he')){
		return new Component('Highly Enriched Uranium Fuel Rod', 10, 24, 36000, true, position, htmlCell);
	} else if(htmlCell.classList.contains('component-dhe')){
		return new Component('Dual Highly Enriched Uranium Fuel Rod', 30, 66, 108000, true, position, htmlCell);
	} else if(htmlCell.classList.contains('component-qhe')){
		return new Component('Quad Highly Enriched Uranium Fuel Rod', 90, 180, 324000, true, position, htmlCell);
	} else if(htmlCell.classList.contains('component-duct')){
		return new Component('Heat Duct', 0, 0, 0, true, position, htmlCell);
	} else if(htmlCell.classList.contains('component-cb1')){
		return new Component('Californium Bombardment 1', -10, 24, -288000, true, position, htmlCell);
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
	/** Used to mark overheated or low on energy components. */
	htmlElement;
	isProcessed = false;
	// TODO: Buffs
	
	constructor(name, energyPerSec, heat, totalEnergy, doesTransferHeat, position, htmlElement) {
		this.name = name;
		this.energyPerSec = energyPerSec;
		this.heat = heat;
		this.totalEnergy = totalEnergy;
		this.doesTransferHeat = doesTransferHeat;
		this.position = position;
		this.htmlElement = htmlElement;
	}
	
	toString() {
		return this.name;
	}
}