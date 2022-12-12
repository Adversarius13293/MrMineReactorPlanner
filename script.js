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


/** Variables for gathering and displaying the reactor stats. */
var warningEnergy;
var warningHeat;
var energyPerSecond;
var energyTotal;
var heatDiff;
var batteryCap;

function updateReactorStats() {
	var cells = document.getElementsByClassName('cell');
	var components = [];
	for(var i = 0; i < cells.length; i++) {
		var comp = createComponentsFromHtml(cells[i]);
		if(comp) {
			// Ignore null objects.
			components[components.length] = comp;
		}
	}
	// Reset all old values.
	warningEnergy = '';
	warningHeat = '';
	energyPerSecond = 0;
	energyTotal = 0;
	heatDiff = 0;
	batteryCap = 0;
	
	// Process buffs first.
	for(var i = 0; i < components.length; i++) {
		var comp = components[i];
		// TODO: Buffs
	}
	
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
		addToRectorStats(currentHeatSystem);
		
		//document.getElementById('debug').textContent+= " heat System size: " + currentHeatSystem.length;
	}
	
	// In the end process remaining stand-alone components.
	for(var i = 0; i < components.length; i++) {
		var comp = components[i];
		if(comp.isProcessed){
			continue;
		}
		addToRectorStats(comp);
	}
	
	document.getElementById('feedback_eps').textContent = this.energyPerSecond;
	document.getElementById('feedback_bcap').textContent = this.batteryCap;
	if(this.batteryCap == 0 || this.energyPerSecond <= 0) {
		document.getElementById('feedback_bfull').textContent = '-';
	} else {
		document.getElementById('feedback_bfull').textContent = this.batteryCap/this.energyPerSecond;	
	}
	document.getElementById('feedback_ediff').textContent = this.energyTotal;
	document.getElementById('feedback_hdiff').textContent = this.heatDiff;
	// rod used up
	// bomb used up
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
			if(comp.heat != 0 || comp.doesTransferHeat) {
				comp.isProcessed = true;
				members[members.length] = comp;
				
				// If it does transfer heat, check its neighbours. Currently only excludes fans.
				if(comp.doesTransferHeat) {
					getHeatSystemMembers(comp, remainingComponents, members);
				}
			}
		}
	}
}

function addToRectorStats(components) {
	// Not sure how dirty this is, to accept arrays and also single objects.
	if(!components.length) {
		components = [components];
	}
	for(var j = 0; j < components.length; j++) {
		comp = components[j];
		
		this.heatDiff += comp.heat;
		if(comp.doesStoreEnergy) {
			this.batteryCap += comp.totalEnergy;
		} else {
			this.energyTotal += comp.totalEnergy;
			this.energyPerSecond += comp.energyPerSec;				
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
	return ['component-empty','component-fan', 'component-he', 'component-dhe', 'component-qhe', 
		'component-e', 'component-de', 'component-qe', 'component-mo', 'component-dmo', 'component-qmo', 
		'component-bs', 'component-bl', 'component-bxl', 'component-hd', 'component-cb', 'component-pb', 'component-sb', 'component-gb', 
		'component-cb1', 'component-cb2', 'component-cb3', 'component-pp', 'component-dpp', 'component-qpp', 
		'component-rtg', 'component-eb1', 'component-eb2', 'component-eb3'];
}

function createComponentsFromHtml(htmlCell) {
	// Id in format 0_3, for first row 4th colum.
	var position = htmlCell.id.split('_');
	if(htmlCell.classList.contains('component-empty')){
		// I do not need empty cells.
		// return new Component('Empty', 0, 0, 0, false, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-fan')){
		return new Component('Fan', 0, -12, 0, false, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-he')){
		return new Component('Highly Enriched Uranium Fuel Rod', 10, 24, 36000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-dhe')){
		return new Component('Dual Highly Enriched Uranium Fuel Rod', 30, 66, 108000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-qhe')){
		return new Component('Quad Highly Enriched Uranium Fuel Rod', 90, 180, 324000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-e')){
		return new Component('Enriched Uranium Fuel Rod', 10, 18, 144000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-de')){
		return new Component('Dual Enriched Uranium Fuel Rod', 30, 48, 432000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-qe')){
		return new Component('Quad Enriched Uranium Fuel Rod', 90, 126, 1296000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-mo')){
		return new Component('Mixed Oxide Fuel Rod', 8, 21, 288000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-dmo')){
		return new Component('Dual Mixed Oxide Fuel Rod', 24, 54, 864000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-qmo')){
		return new Component('Quad Mixed Oxide Fuel Rod', 72, 144, 2592000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-bs')){
		return new Component('Small Battery', 0, 0, 5000, false, true, position, htmlCell);
	} else if(htmlCell.classList.contains('component-bl')){
		return new Component('Large Battery', 0, 0, 50000, false, true, position, htmlCell);
	} else if(htmlCell.classList.contains('component-bxl')){
		return new Component('Extra Large Battery', 0, 0, 250000, false, true, position, htmlCell);
	} else if(htmlCell.classList.contains('component-hd')){
		return new Component('Heat Duct', 0, 0, 0, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-cb')){
		return new Component('Copper Buff', 0, 0, 0, false, false, position, htmlCell); // TODO
	} else if(htmlCell.classList.contains('component-pb')){
		return new Component('Platinum Buff', 0, 0, 0, false, false, position, htmlCell); // TODO
	} else if(htmlCell.classList.contains('component-sb')){
		return new Component('Silver Buff', 0, 0, 0, false, false, position, htmlCell); // TODO
	} else if(htmlCell.classList.contains('component-gb')){
		return new Component('Gold Buff', 0, 0, 0, false, false, position, htmlCell); // TODO
	} else if(htmlCell.classList.contains('component-cb1')){
		return new Component('Californium Bombardment 1', -10, 24, -288000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-cb2')){
		return new Component('Californium Bombardment 2', -30, 72, -864000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-cb3')){
		return new Component('Californium Bombardment 3', -90, 216, -2592000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-pp')){
		return new Component('Pu/Po Fuel Rod', 16, 36, 921600, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-dpp')){
		return new Component('Dual Pu/Po Fuel Rod', 48, 96, 2764800, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-qpp')){
		return new Component('Quad Pu/Po Fuel Rod', 144, 264, 8294400, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-rtg')){
		return new Component('Polonium RTG Fuel Rod', 6, 15, 1036800, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-eb1')){
		return new Component('Einsteinium Bombardment 1', -20, 30, -1152000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-eb2')){
		return new Component('Einsteinium Bombardment 2', -60, 90, -3456000, true, false, position, htmlCell);
	} else if(htmlCell.classList.contains('component-eb3')){
		return new Component('Einsteinium Bombardment 3', -180, 180, -10368000, true, false, position, htmlCell);
	} else {
		// TODO: Unknwon class?
	}
}

class Component {
	name;
	energyPerSec;
	heat;
	totalEnergy;
//	totalDuration; // Comes from energyPerSec and totalEnergy.
	doesTransferHeat;
	doesStoreEnergy;
	position;
	/** Used to maybe mark overheated or low on energy components? */
	htmlElement;
	isProcessed = false;
	// TODO: Buffs
	
	constructor(name, energyPerSec, heat, totalEnergy, doesTransferHeat, doesStoreEnergy, position, htmlElement) {
		this.name = name;
		this.energyPerSec = energyPerSec;
		this.heat = heat;
		this.totalEnergy = totalEnergy;
		this.doesTransferHeat = doesTransferHeat;
		this.doesStoreEnergy = doesStoreEnergy;
		this.position = position;
		this.htmlElement = htmlElement;
	}
	
	toString() {
		return this.name + '('+this.isProcessed+')';
	}
}