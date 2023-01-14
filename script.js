/**
* Toggle between hiding and showing the dropdown on button click. Hides other cells dropdowns.
* If quick build is active, immediately set the cells new component.
*/
function onCellClick(dropdownId, caller) {
	var wasShown = document.getElementById(dropdownId).classList.contains('show');
	// Hide previous dropdowns, in case multiple cells are clicked without selecting a component.
	hideDropdowns();
	if(caller.id != 'quick-build-button' && document.getElementById('use-quick-build').checked) {
		setComponent(caller.id, document.getElementById('quick-build-button'));
	} else {
		if(!wasShown){
			// All dropdowns are allready hidden. Only change something if it's supposed to be shown.
			document.getElementById(dropdownId).classList.toggle('show');
		}
	}
}

/**
* Close the dropdown if clicked outside of any cell button.
*/
window.onclick = function(event) {
	if (!event.target.matches('.cell')
				&& !event.target.matches('#quick-build-button')
				&& !event.target.matches('.no-hide-on-click')) {
		hideDropdowns();
	}
}

/**
* Hide every dropdown menu.
*/
function hideDropdowns() {
	var dropdowns = document.getElementsByClassName('show');
	for (var i = 0; i < dropdowns.length; i++) {
		dropdowns[i].classList.remove('show');
	}
}

/** 
* Set a cells style to a specific elements style, in addition to the default cell style.
*/
function setComponent(forCellId, copyClassFrom) {
	var styleClass = copyClassFrom.className;
	var cell = document.getElementById(forCellId);
	// Don't make it a cell and update reactor, if it's the quick build select for example.
	if(cell.classList.contains('cell')) {
		if (!cell.classList.contains(styleClass)) {
			cell.className = "cell " + styleClass;
		}
		updateReactorStats();
	} else {
		cell.className = styleClass;
		updateCompDescription();
	}
}

function updateCompDescription() {
	var comp = createComponentFromHtml(document.getElementById('quick-build-button'));
	var description = document.getElementById('comp-description');
	description.innerHTML = '';
	// Tried to keep the format close to the ingame display.
	if(comp != null) {
		description.innerHTML += '<b>' + comp.name + '</b><br/>';
		if(comp.energyPerSec != 0) {
			description.innerHTML += 'Energy: ' + formatNumber(comp.energyPerSec) + '/sec';
			if(comp.heat != 0) {
				description.innerHTML += ' (' + formatNumber(comp.energyPerSec/comp.heat) + ' energy/heat)';
			}
			description.innerHTML += '<br/>';
		}
		if(comp.heat != 0) {
			description.innerHTML += 'Heat: ' + formatNumber(comp.heat) + '/sec';
			if(comp.heat > 0){
				// TODO: Do not hard code the fan heat? If the value gets changed, nobody will remember this part.
				description.innerHTML += ' (' + formatNumber(comp.heat/12)+' fans)';
			}
			description.innerHTML += '<br/>'
		}
		if(comp.totalEnergy != 0) {
			description.innerHTML += 'Total Energy Production: ' + formatNumber(comp.totalEnergy) + '<br/>';
		}
		if(comp.totalEnergy != 0 && comp.energyPerSec != 0) {
			description.innerHTML += 'Total Duration: ' + formatTime(comp.getBuffedTotalDuration()) + '<br/>';
		}
		if(comp.energyStorage != 0) {
			description.innerHTML += 'Stores ' + formatNumber(comp.energyStorage) + ' energy<br/>';
		}
		// Technically rods should get this text too. But they don't do in the game either.
		if(comp.doesTransferHeat && comp.heat == 0) {
			description.innerHTML += 'Connects different heat components together<br/>';
		}
		if(comp.providedBuff != 0) {
			description.innerHTML += 'Boosts components by '+formatNumber(comp.providedBuff*100)+'% in each given direction<br/>';
		}
	}
}

/**  
* Set the reactor level, which changes the available fields.
* Starts at level 1 with 3x3, and ends at level 5 with 9x9.
* Unknown values for level will have all cells enabled.
* Will call updateReactorStats() in the end.
*/
function setReactorLevel(level = null, clearEverything = false) {
	if(level == null) {
		level = document.getElementById('level').value;
	}
	var cells = document.getElementsByClassName('cell');
	for(var i = 0; i < cells.length; i++) {
		var cell = cells[i];
		var position = parsePosition(cell.id);
		// Always activate everything first.
		if (cell.hasAttribute('disabled')) {
			cell.removeAttribute('disabled');
		}
		// TODO: Is it a good idea to use this whole function just to clear all cells?
		if(clearEverything) {
			cell.className = "cell c-empty";
		}
		// Now remove cells as needed.
		// TODO: Could put everything in one if, but that sounds messy?
		if(level == 4) {
			if(position[0] == 0 || position[1] == 0 || position[0] == 8 || position[1] == 8
					|| ((position[0] == 1 || position[0] == 7) && (position[1] == 1 || position[1] == 7))) {
				// Remove all placed components.
				cell.className = "cell c-empty";
				cell.setAttribute('disabled', '');
			}
		} else if(level == 3) {
			if(position[0] < 2 || position[1] < 2 || position[0] > 6 || position[1] > 6) {
				cell.className = "cell c-empty";
				cell.setAttribute('disabled', '');
			}
		} else if(level == 2) {
			if(position[0] < 3 || position[1] < 2 || position[0] > 5 || position[1] > 6) {
				cell.className = "cell c-empty";
				cell.setAttribute('disabled', '');
			}
		} else if(level == 1) {
			if(position[0] < 3 || position[1] < 3 || position[0] > 5 || position[1] > 5) {
				cell.className = "cell c-empty";
				cell.setAttribute('disabled', '');
			}
		}
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
	
	// Things for displaying warnings.
	document.getElementById('feedback-warning').textContent = '';
	document.getElementById('feedback-hint').textContent = '';
	var levelExceeded = false;
	var overheated = false;
	var usedGreenUranium = false;
	
	for(var i = 0; i < cells.length; i++) {
		var comp = createComponentFromHtml(cells[i]);
		// Ignore null objects.
		if(comp) {
			clearDecorations(cells[i]);
			components[components.length] = comp;			
			if(document.getElementById('level').value < comp.minLevel) {
				levelExceeded = true;
			}
			if('Enriched Uranium Fuel Rod' == comp.name || 'Dual Enriched Uranium Fuel Rod' == comp.name
					|| 'Quad Enriched Uranium Fuel Rod' == comp.name) {
				usedGreenUranium = true;
			}
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
		if(comp.isProcessed || comp.buffDirections == 0){
			continue;
		}
		// Find matching neighbours.
		for(var j = 0; j < components.length; j++) {
			var neigh = components[j];			
			var diffRow = neigh.position[0] - comp.position[0];
			var diffCol = neigh.position[1] - comp.position[1];
			if(((1 & comp.buffDirections) && (diffRow == -1 && diffCol == 0)) // North
					|| ((2 & comp.buffDirections) && (diffRow == -1 && diffCol == 1))
					|| ((4 & comp.buffDirections) && (diffRow == 0 && diffCol == 1)) // East
					|| ((8 & comp.buffDirections) && (diffRow == 1 && diffCol == 1))
					|| ((16 & comp.buffDirections) && (diffRow == 1 && diffCol == 0)) // South
					|| ((32 & comp.buffDirections) && (diffRow == 1 && diffCol == -1))
					|| ((64 & comp.buffDirections) && (diffRow == 0 && diffCol == -1)) // West
					|| ((128 & comp.buffDirections) && (diffRow == -1 && diffCol == -1))) {
				// Buff anything. If and what attributes are affected need to be managed by the buffed component.
				neigh.buff += comp.providedBuff;
			}
		}
		comp.isProcessed = true;
	}
	
	// Then need to process heat transfering elements. To not mark a non transfering heat
	// component as processed, which then later can't be included in a heat system anymore.
	var foundHeatSystems = [];
	for(var i = 0; i < components.length; i++) {
		var comp = components[i];
		// Skip non transfering (fans) and non heat producing/consuming components (ducts).
		// They do not initiate a heat system. And won't share other fans without energy.
		if(comp.isProcessed || (!comp.doesTransferHeat || comp.heat == 0)){
			continue;
		}
		// Unflag fans, so they can be integrated in multiple heat system.
		var unflaggedFans = setProcessedForHeatNoTransfer(components, false);
		
		comp.isProcessed = true;
		var currentHeatSystem = [];		
		currentHeatSystem[0] = comp;
		foundHeatSystems[foundHeatSystems.length] = currentHeatSystem;
		
		getHeatSystemMembers(comp, components, currentHeatSystem);
		
		// Reflag unflagged fans again, so they won't be evaluated an extra time by the final loop.
		setProcessedForHeatNoTransfer(unflaggedFans, true);
	}
	// Need to update reactor stats with heat system afterwards, to properly include shared components.
	for(var i = 0; i < foundHeatSystems.length; i++) {
		var currentHeatSystem = foundHeatSystems[i];
		if(getSystemHeat(currentHeatSystem) > 0) {
			var overheated = true;
			for(var j = 0; j < currentHeatSystem.length; j++) {
				var comp = currentHeatSystem[j];
				comp.htmlElement.classList.add('cell-overheat');
			}
		}
		addToRectorStats(currentHeatSystem);
	}
	
	// In the end, process remaining stand-alone or unused components.
	for(var i = 0; i < components.length; i++) {
		var comp = components[i];
		if(comp.isProcessed){
			continue;
		}
		addToRectorStats(comp);
	}
	
	var elem = document.getElementById('feedback_eps');
	this.energyPerSecond = accountForFloatingPointError(this.energyPerSecond);
	elem.textContent = formatNumber(this.energyPerSecond);
	// TODO: Move coloring into function call.
	clearDecorations(elem);
	if(this.energyPerSecond < 0) {
		elem.classList.add('red');
	} else if(this.energyPerSecond == 0) {
		elem.classList.add('green');
	}
	
	elem = document.getElementById('feedback_bcap');
	elem.textContent = formatNumber(this.batteryCap);
	clearDecorations(elem);
	if(this.batteryCap < this.energyTotal || (this.energyTotal < 0 && this.batteryCap < this.energyTotal*-1)) {
		elem.classList.add('red');
	} else if(this.batteryCap > this.energyTotal) {
		elem.classList.add('green');
	}
	
	if(this.batteryCap == 0 || this.energyPerSecond <= 0) {
		document.getElementById('feedback_bfull').textContent = '-';
	} else {
		document.getElementById('feedback_bfull').textContent = formatTime(this.batteryCap/this.energyPerSecond);
	}
	
	document.getElementById('feedback_ediff').textContent = formatNumber(this.energyTotal);
	
	elem = document.getElementById('feedback_hdiff');
	this.heatDiff = accountForFloatingPointError(this.heatDiff);
	elem.textContent = formatNumber(this.heatDiff);
	clearDecorations(elem);
	if(this.heatDiff > 0) {
		elem.classList.add('red');
	} else if(this.heatDiff == 0) {
		elem.classList.add('green');
	} else {
		// Keep default? Or make it green, too?
	}
	// TODO: Read the heat value for fans from some variable. This issue is noted somewhere else already.
	document.getElementById('feedback_hdiffpercent').textContent = formatNumber(this.heatDiff/0.12);
	
	// rod used up
	// bomb used up
	
	if(levelExceeded) {
		document.getElementById('feedback-warning').textContent = 'You are using components that are not available for the selected reactor level. ';
	}
	if(overheated) {
		document.getElementById('feedback-warning').textContent += 'At least one component is not cooled enough! ';
	}
	if(usedGreenUranium) {
		document.getElementById('feedback-hint').textContent += 'You are using the green Enriched Uranium Fuel Rods, which is strongly advised against for isotope balance reasons. ';
	}
	// To have at least an empty line, if everything else is false.
	document.getElementById('feedback-warning').textContent += ' ';
}
/**
* Recursivly get all connected heat components, starting from the currentComponent.
* Will extend the members array with new members.
*/
function getHeatSystemMembers(currentComponent, remainingComponents, members) {
	for(var i = 0; i < remainingComponents.length; i++) {
		var comp = remainingComponents[i];
		if(comp.isProcessed){
			continue;
		}
		var diffX = Math.abs(currentComponent.position[0] - comp.position[0]);
		var diffY = Math.abs(currentComponent.position[1] - comp.position[1]);
		// Only one step in only one direction, so it is a neighbour.
		if(diffX + diffY == 1) {
			if(comp.heat != 0 || comp.doesTransferHeat) {
				comp.isProcessed = true;
				comp.numberOfSystems += 1;
				members[members.length] = comp;
				
				// If it does transfer heat, check its neighbours. Currently only excludes fans.
				if(comp.doesTransferHeat) {
					getHeatSystemMembers(comp, remainingComponents, members);
				}
			}
		}
	}
}
/**
* Change isProcessed to the given value, for heat components that do not transfer heat (Fans).
* Returns all changed components as an array.
*/
function setProcessedForHeatNoTransfer(components, isProcessedValue) {
	var changed = [];
	for(var i = 0; i < components.length; i++) {
		var comp = components[i];
		// Only look at components that have to be changed, and are non transfering heat comps.
		// Which currently means just fans.
		if(comp.isProcessed != isProcessedValue && (comp.heat != 0 && !comp.doesTransferHeat)) {
			comp.isProcessed = isProcessedValue;
			changed[changed.length] = comp;
		}
	}
	return changed;
}

/**
* Get the summed up (buffed) heat of the given components.
*/
function getSystemHeat(members) {
	var systemHeat = 0;
	for(var i = 0; i < members.length; i++) {
		var comp = members[i];
		systemHeat += comp.getBuffedHeat();
	}
	return accountForFloatingPointError(systemHeat);
}

function addToRectorStats(components) {
	// Not sure how dirty this is, to accept arrays and also single objects.
	if(!components.length) {
		components = [components];
	}
	for(var j = 0; j < components.length; j++) {
		comp = components[j];
		
		this.heatDiff += comp.getBuffedHeat();
		this.energyTotal += comp.totalEnergy;
		this.batteryCap += comp.getBuffedEnergyStorage();
		this.energyPerSecond += comp.getBuffedEnergyPerSec();
	}
}
/**
* Fill the reactor container with all the cell buttons and a dropdown menu for every button.
*/
window.onload = function() {
	var reactorContainerNode = document.getElementById('reactor-container');
	reactorContainerNode.innerHTML = '';
	for(var i = 0; i < 9; i++) {
		for(var j = 0; j < 9; j++) {
			// Div containing the button.
			var cellContainer = document.createElement('div');
			cellContainer.className = 'cell-container';
			reactorContainerNode.appendChild(cellContainer);
			
			// The button that displays each cell.
			var cellBtn = document.createElement('button');
			cellBtn.className = 'cell c-empty'
			cellBtn.id = i+'_'+j;
			// All this function-ing feels weird, but seems the only way to make it work.
			// https://stackoverflow.com/questions/6048561/setting-onclick-to-use-current-value-of-variable-in-loop
			cellBtn.onclick = function(arg, arg2) {
				return function() {
					onCellClick(arg, arg2);					
				}
			}('dropdown_'+i+'_'+j, cellBtn);
			cellContainer.appendChild(cellBtn);
			
			// Div for the selection dropdown of each cell, hidden by default.
			var dropdown = document.createElement('div');
			dropdown.id = 'dropdown_'+i+'_'+j;
			dropdown.className = 'dropdown-content';
			cellContainer.appendChild(dropdown);
			
			// Dropown options, for each cell.
			// TODO: Reusing just one dropdown div for all buttons would be nice, but that requires 
			// 		 to find the current cell button. And the dropdown has to be aligned dynamically.
			addDropdownOptions(dropdown, i+'_'+j);
		}
		reactorContainerNode.appendChild(document.createElement('br'));
	}
	
	addDropdownOptions(document.getElementById('quick-build-dropdown'), 'quick-build-button')
	
	// Contains parameters like ?layout=abc&layout=xyz from url.
	loadAndSaveLayouts(window.location.search);
	
	// Properly initialize all the numbers.
	updateReactorStats();
}

function addDropdownOptions(parentNode, cellId) {
	var componentClasses = getAllComponentsCss();
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

//////////////////// Begin export/import/save functionality ////////////////////
const delimiter = '|';
/** URL Parameter to store layout strings in. */
const parameterNameLayout = 'layout';

// TODO: Distinguish naming for import string, layout, url params.

/**
* Will load and save every layout, and end with the last one active.
*/
function loadAndSaveLayouts(importStringOrUrl) {
	var layouts = getLayoutsFromUrlOrParams(importStringOrUrl);
	for(var i = 0; i < layouts.length; i++) {
		if(loadLayoutFromString(layouts[i])) {
			addLayoutToSaves();
		}
	}
}

/**
* Converts the current reactor layout to one string.
* Leading with the given layout name, reactor level, currently empty column,
* and at the end the serialized components.
* Everything joined by delimiters.
* 
* Example: Reactor Test|1||aaaaaayaaaaxaveaaaafhnoaratazapdbbaaajaaaaasaaaaeaqkAaauaamaaaaaaaaCacaqaaaaaaaeb
*/
function convertLayoutToString() {
	// Last field reserved for something like initial battery.
	var result = document.getElementById('layout-name').value + delimiter + document.getElementById('level').value + delimiter + delimiter;
	var cells = document.getElementsByClassName('cell');
	for(var i = 0; i < cells.length; i++) {
		var cellCompClass = getComponentClassOnly(cells[i]);

		result += getAllSerializationStrings()[getAllComponentsCss().indexOf(cellCompClass)];
	}
	return result;
}

/**
* Assumes correctly formated and already decoded input string.
* Returns false if nothing got saved because of invalid layout string,
* otherwise returns true.
*/
function loadLayoutFromString(layout) {
	if(!layout) {
		// No string provided, just do nothing?
		return false;
	}
	var splitted = layout.split(delimiter);
	if(splitted.length !=4) {
		// Invalid format.
		return false;
	}
	var name = splitted[0];
	document.getElementById('layout-name').value = splitted[0];
	var level = splitted[1];
	// TODO: Should the html level be set inside setReactorLevel()?
	// Does not trigger the html onchange event.
	document.getElementById('level').value = level;
	// splitted[2] currently unused.
	var serializedString = splitted[3];
	for(var i = 0; i < serializedString.length; i++) {
		var cssClass = getAllComponentsCss()[getAllSerializationStrings().indexOf(serializedString.charAt(i))];
		document.getElementsByClassName('cell')[i].className = 'cell ' + cssClass;
	}
	// The layout string contains every cell, meaning it will make cells empty if needed.
	// No need to create an empty reactor with setReactorLevel(), before setting all the components.
	// By calling setReactorLevel() after setting the components, we make sure that there aren't any
	// components outside the valid level-area, in case someone manipulated the layout string.
	setReactorLevel(level, false);
	return true;
}

/**
* Accepts layout parameters with and without url prefix,
* and returns the an array of the decoded layout strings.
*/
function getLayoutsFromUrlOrParams(layoutUrl) {
	if(!layoutUrl) {
		return [];
	}
	// TODO: Do some checks? It currently accepts any string.
	var urlParams;
	try {
		var url = new URL(layoutUrl);
		urlParams = url.searchParams;
	} catch(_) {
		// Wasn't a valid url, so hopefully direct params.
		urlParams = new URLSearchParams(layoutUrl);
		// Thoughts: Would like to make it work with convertLayoutToString() as input string.
		// Because it would be nice if the user could inport clean looking layout strings.
		// But that is not encoded, and can contain parameter-like strings.
		// Can't make it work 100%, so just don't support it at all.
	}
	return urlParams.getAll(parameterNameLayout);
}
// TODO: Properly name popup and dropdown everywhere.

function showExportPopup(textFieldContent){
	hideDropdowns();
	document.getElementById('popup-window').classList.add('show');
	document.getElementById('export-field').value = textFieldContent;
	document.getElementById('warn-length').style.display = 'none';
	if(textFieldContent.length >= 2000) {
		document.getElementById('warn-length').style.display = 'block';
	}
}

/**
* Shows the current reactor layout string including the full url.
*/
function exportCurrentLayout() {
	// Somehow can't mark and copy messages of alert(), if the word is more than 80 characters long?
	showExportPopup(getUrlForLayout() + encodeURIComponent(convertLayoutToString()));
}

function exportSavedLayouts() {
	var exportString = '';
	var selectElement = document.getElementById('saves')
	for(var i = 0; i < selectElement.length; i++) {
		exportString += encodeURIComponent(selectElement[i].value);
		if(i < selectElement.length-1) {
			exportString += '&' + parameterNameLayout + '=';
		}
	}
	showExportPopup(getUrlForLayout() + exportString);
}

/**
* Get the url including the url parameter name for the reactor layout string.
*/
function getUrlForLayout() {
	return location.protocol + '//' + location.host + location.pathname + '?'+parameterNameLayout+'='
}

/**
* Let the user import a layout string via prompt.
* Will do nothing if without any input.
*/
function queryImportString() {
	var input = prompt('Please input an import string:');
	// Pressing 'cancel' will return null. Empty string is handled with this, too.
	if(input) {
		loadAndSaveLayouts(input);
	}
}

/**
* Remove all delimiter characters from user input field for the layout name.
*/
function normalizeInputName() {
	document.getElementById('layout-name').value = document.getElementById('layout-name').value
			.replace(delimiter, '');
			// Should not need to care about parameter-like names. Since it will get encoded.
			// Could only become a problem if convertLayoutToString() would get passed into getLayoutsFromUrlOrParams().
			//.replace(parameterNameLayout + '=', parameterNameLayout); 
}

/**
* Add the current reactor layout with its name to the saves list.
* If you want to save a specific layout, it has to be loaded in first.
* Will enable load and delete buttons.
*/
// TODO: Not very nice to only add entries to the list after havint to rendering it first?
function addLayoutToSaves() {
	var selectElement = document.getElementById('saves');
	var opt = document.createElement('option');
	opt.value = convertLayoutToString();
	opt.innerHTML = document.getElementById('layout-name').value;
	opt.selected = true;
	selectElement.appendChild(opt);
	document.getElementById('load-layout').disabled = false;
	document.getElementById('delete-layout').disabled = false;
	document.getElementById('move-save-down').disabled = false;
	document.getElementById('move-save-up').disabled = false;
	document.getElementById('export-all').disabled = false;
}

/**
* Removes the currently selected save entry.
* Automatically selects the next entry.
* Disables load and delete if it was the last save entry.
*/
function removeSelectedSave() {
	var selectElement = document.getElementById('saves');
	var currentIndex = selectElement.selectedIndex;
	// Should never be -1 if disabling buttons work, but just to be sure.
	if(currentIndex >= 0) {
		selectElement.options.remove(currentIndex);
		var newIndex = Math.min(currentIndex, selectElement.options.length-1);
		if(newIndex >= 0) {
			selectElement.options[newIndex].selected = true;
		} else {
			document.getElementById('load-layout').disabled = true;
			document.getElementById('delete-layout').disabled = true;
			document.getElementById('move-save-down').disabled = true;
			document.getElementById('move-save-up').disabled = true;
			document.getElementById('export-all').disabled = true;
		}
	}
}

/**
* Tries to move the selected save in the given direction.
* Direction is a number. Positive numbers will move it by that amount downwards,
* and negative numbers upwards in the list.
* Will stop when reaching the lower or upper limit.
*/
function moveSave(direction) {
	var selectElement = document.getElementById('saves');
	var currentIndex = selectElement.selectedIndex;
	if(currentIndex >= 0) {
		if(direction > 0) {
			var targetIndex = Math.min(currentIndex + direction, selectElement.length-1);
			// Adding an existing option seems to remove it from the old index, not insert it a second time.
			// Since the old option with lower index will get removed afterwards, and all following options,
			// including the newly inserted, will move one down by this, the index has to be one higher.
			selectElement.add(selectElement[currentIndex], targetIndex + 1);
			selectElement.selectedIndex = targetIndex;
		} else if(direction < 0) {
			var targetIndex = Math.max(currentIndex + direction, 0);
			selectElement.add(selectElement[currentIndex], targetIndex);
			selectElement.selectedIndex = targetIndex;
		}
	}
}

////////////////////  ////////////////////

/**
* Move layout one tile in the given direction.
* Does remove components that fall outside the current reactors level area.
* Updates reactor stats afterwards.
* Directions: 1=N 4=E 16=S 64=W
*/
function moveLayout(direction){
	// TODO: Find a more elegant solution without code duplication?
	if(1 & direction) { // North
		for(var i = 0; i < 8; i++) {
			for(var j = 0; j < 9; j++) {
				document.getElementById(i+'_'+j).className = document.getElementById((i+1)+'_'+j).className;
			}
		}
		for(var j = 0; j < 9; j++) {
			document.getElementById('8_'+j).className = "cell c-empty";
		}
	}
	if(4 & direction) { // East
		for(var i = 0; i < 9; i++) {
			for(var j = 8; j > 0; j--) {
				document.getElementById(i+'_'+j).className = document.getElementById(i+'_'+(j-1)).className;
			}
		}
		for(var i = 0; i < 9; i++) {
			document.getElementById(i+'_0').className = "cell c-empty";
		}
	}
	if(16 & direction) { // South
		for(var i = 8; i > 0; i--) {
			for(var j = 0; j < 9; j++) {
				document.getElementById(i+'_'+j).className = document.getElementById((i-1)+'_'+j).className;
			}
		}
		for(var j = 0; j < 9; j++) {
			document.getElementById('0_'+j).className = "cell c-empty";
		}
	}
	if(64 & direction) { // West
		for(var i = 0; i < 9; i++) {
			for(var j = 0; j < 8; j++) {
				document.getElementById(i+'_'+j).className = document.getElementById(i+'_'+(j+1)).className;
			}
		}
		for(var i = 0; i < 9; i++) {
			document.getElementById(i+'_8').className = "cell c-empty";
		}
	}
	// Currently used to remove components out of the valid area.
	setReactorLevel();
}

/**
* Rotate the reactor layout clockwise.
* Does remove components that fall outside the current reactors level area.
* Does not replace buff components, since they don't exists for each direction.
* Updates reactor stats afterwards.
*/
function rotateLayout() {
	for(var i = 0; i < 4; i++) {
		for(var j = 0; j < 5; j++) {
			var oldClass = document.getElementById(i+'_'+j).className;
			document.getElementById(i+'_'+j).className = document.getElementById((8-j)+'_'+i).className;
			document.getElementById((8-j)+'_'+i).className = document.getElementById((8-i)+'_'+(8-j)).className;
			document.getElementById((8-i)+'_'+(8-j)).className = document.getElementById(j+'_'+(8-i)).className;
			document.getElementById(j+'_'+(8-i)).className = oldClass;
		}
	}
	setReactorLevel();
}

/**
* Get only the css component part of the object.
* Or 'unknown' if it has none.
*/
function getComponentClassOnly(htmlElement) {
	var classes = htmlElement.classList;
	for(var i = 0; i < classes.length; i++) {
		if(getAllComponentsCss().includes(classes[i])) {
			return classes[i];
		}
	}
	return 'unknown';
}

/**
* Get all possible reactor component css classes.
*/
function getAllComponentsCss() {
	// TODO: Dynamically read all '.c-' classes from css file?
	// var sheets = document.styleSheets;
	// TODO: Or at least use array of Component objects, so the classes are only defined once in javascript.
	return ['c-empty','c-fan', 'c-he', 'c-dhe', 'c-qhe', 
		'c-e', 'c-de', 'c-qe', 'c-mo', 'c-dmo', 'c-qmo', 
		'c-bs', 'c-bl', 'c-bxl', 'c-hd', 'c-cb', 'c-pb', 'c-sb', 'c-gb', 
		'c-cb1', 'c-cb2', 'c-cb3', 'c-pp', 'c-dpp', 'c-qpp', 
		'c-rtg', 'c-eb1', 'c-eb2', 'c-eb3'];
}

/**
* Get all serialized strings for components.
* Matches index with getAllComponentsCss().
*/
function getAllSerializationStrings() {
	// TODO: Find a better way to bind components, serialization and css together. This feels really bad.
	// TODO: Maybe compute letter from css index? But then changing something would brake all old strings.
	return ['a', 'b', 'c', 'd', 'e', 
			'f', 'g', 'h', 'i', 'j', 'k', 
			'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 
			't', 'u', 'v', 'w', 'x', 'y', 
			'z', 'A', 'B', 'C'];
}

/**
* Limit to two decimals, convert -0 to 0, and add thousands separator.
*/
function formatNumber(number) {
	number = accountForFloatingPointError(number);
	if(number == -0) {
		return 0;
	} else {
		return number.toLocaleString(undefined, {maximumFractionDigits: 2});
	}
}

/**
* Returns a string representation of the given seconds in its time units.
* Will omit the highest and lowest units if they are all 0.
*
* Example outputs:
* 1d 2:00:04h
* 5d
* 40:20m
* 12s
*/
function formatTime(seconds) {
	// TODO: Support miliseconds?
	seconds = Math.round(seconds)
	if(seconds == 0){
		return '0s';
	}
	var isNegative = false;
	if(seconds < 0) {
		isNegative = true;
		seconds *= -1;
	}
	var d = (seconds/(60*60*24)) | 0;
	var h = (seconds/(60*60))%24 | 0;
	var m = (seconds/(60))%60 | 0;
	var s = seconds%60 | 0;
	
	var timeString = '';
	var unit;
	if(isNegative) {
		timeString = '-'
	}
	if(d != 0) {
		timeString += d + 'd '
	}
	if(h != 0) {
		timeString += h;
		unit = 'h';
	}
	if(unit && (m != 0 || s != 0)) {
		timeString += ':' + m.toLocaleString(undefined, {minimumIntegerDigits: 2});
	} else if(m != 0) {
		// TODO: Use m instead? But that looks so much like meter...
		//       Reactor times ingame seem only to start at hours.
		unit = 'min';
		timeString += m;
	}
	if(unit && s != 0) {
		timeString += ':' + s.toLocaleString(undefined, {minimumIntegerDigits: 2});
	} else if(s != 0) {
		unit = 's';
		timeString += s;
	}
	if(unit) {
		timeString += unit;
	}
	return timeString;
}

function clearDecorations(htmlElement) {
	if (htmlElement.classList.contains('cell-overheat')) {
		htmlElement.classList.remove('cell-overheat');
	}
	if(htmlElement.classList.contains('red')) {
		htmlElement.classList.remove('red');
	}
	if(htmlElement.classList.contains('green')) {
		htmlElement.classList.remove('green');
	}
}

function accountForFloatingPointError(number) {
	// toFixed converts it to a string with the given length.
	// So parse to number again to remove trailing decimal zeros.
	// Just a random reasonable looking length.
	return parseFloat(number.toFixed(8));
}

/**
* Id in format 0_3, for first row 4th colum. 
*/
function parsePosition(idString) {
	return idString.split('_');
}

/**
* Write something in my debug html element.
*/
function logDebug(message, append = false){
	var currentDate = new Date();
	document.getElementById('debug').textContent = '[' + currentDate.toLocaleTimeString() + '] ' + message;
}

function createComponentFromHtml(htmlCell) {
	var position = parsePosition(htmlCell.id);
	if(htmlCell.classList.contains('c-empty')){
		// Don't need empty cell objects.
		// return new Component('Empty', 1, 0, 0, 0, false, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-fan')){
		return new Component('Fan', 1, 0, -12, 0, false, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-he')){
		return new Component('Highly Enriched Uranium Fuel Rod', 1, 10, 24, 36000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-dhe')){
		return new Component('Dual Highly Enriched Uranium Fuel Rod', 2, 30, 66, 108000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-qhe')){
		return new Component('Quad Highly Enriched Uranium Fuel Rod', 3, 90, 180, 324000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-e')){
		return new Component('Enriched Uranium Fuel Rod', 1, 10, 18, 144000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-de')){
		return new Component('Dual Enriched Uranium Fuel Rod', 2, 30, 48, 432000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-qe')){
		return new Component('Quad Enriched Uranium Fuel Rod', 3, 90, 126, 1296000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-mo')){
		return new Component('Mixed Oxide Fuel Rod', 1, 8, 21, 288000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-dmo')){
		return new Component('Dual Mixed Oxide Fuel Rod', 2, 24, 54, 864000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-qmo')){
		return new Component('Quad Mixed Oxide Fuel Rod', 3, 72, 144, 2592000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-bs')){
		return new Component('Small Battery', 1, 0, 0, 0, false, 5000, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-bl')){
		return new Component('Large Battery', 2, 0, 0, 0, false, 50000, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-bxl')){
		return new Component('Extra Large Battery', 3, 0, 0, 0, false, 250000, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-hd')){
		return new Component('Heat Duct', 1, 0, 0, 0, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-cb')){
		return new Component('Copper Buff', 2, 0, 0, 0, false, false, 0.55, 1+16, position, htmlCell);
	} else if(htmlCell.classList.contains('c-pb')){
		return new Component('Platinum Buff', 4, 0, 0, 0, false, false, 0.55, 16+64, position, htmlCell);
	} else if(htmlCell.classList.contains('c-sb')){
		return new Component('Silver Buff', 4, 0, 0, 0, false, false, 0.55, 1+4, position, htmlCell);
	} else if(htmlCell.classList.contains('c-gb')){
		return new Component('Gold Buff', 5, 0, 0, 0, false, false, 0.30, 2+8+32+128, position, htmlCell);
	} else if(htmlCell.classList.contains('c-cb1')){
		return new Component('Californium Bombardment 1', 1, -10, 24, -288000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-cb2')){
		return new Component('Californium Bombardment 2', 2, -30, 72, -864000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-cb3')){
		return new Component('Californium Bombardment 3', 3, -90, 216, -2592000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-pp')){
		return new Component('Pu/Po Fuel Rod', 1, 16, 36, 921600, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-dpp')){
		return new Component('Dual Pu/Po Fuel Rod', 2, 48, 96, 2764800, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-qpp')){
		return new Component('Quad Pu/Po Fuel Rod', 3, 144, 264, 8294400, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-rtg')){
		return new Component('Polonium RTG Fuel Rod', 1, 6, 15, 1036800, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-eb1')){
		return new Component('Einsteinium Bombardment 1', 5, -20, 30, -1152000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-eb2')){
		return new Component('Einsteinium Bombardment 2', 5, -60, 90, -3456000, true, false, 0, 0, position, htmlCell);
	} else if(htmlCell.classList.contains('c-eb3')){
		return new Component('Einsteinium Bombardment 3', 5, -180, 180, -10368000, true, false, 0, 0, position, htmlCell);
	} else {
		logDebug("Found unknown type of cell!");
	}
}
class Component {
	name;
	minLevel;
	energyPerSec;
	heat;
	totalEnergy;
//	totalDuration; // Comes from energyPerSec and totalEnergy.
	doesTransferHeat;
	energyStorage;
	position;
	/** Used to maybe mark overheated or low on energy components? */
	htmlElement;
	providedBuff;
	/** Binary sum: 1=N 2=NE 4=E 8=SE 16=S 32=SW 64=W 128=NW */
	buffDirections;
	/** A fan can be shared by multiple heat systems, and only provides part of its effect to each one. */
	numberOfSystems = 0;
	buff = 0.0;
	isProcessed = false;
	
	constructor(name, minLevel, energyPerSec, heat, totalEnergy, doesTransferHeat,
			energyStorage, providedBuff, buffDirections, position, htmlElement) {
		this.name = name;
		this.minLevel = minLevel;
		this.energyPerSec = energyPerSec;
		this.heat = heat;
		this.totalEnergy = totalEnergy;
		this.doesTransferHeat = doesTransferHeat;
		this.energyStorage = energyStorage;
		this.providedBuff = providedBuff;
		this.buffDirections = buffDirections;
		this.position = position;
		this.htmlElement = htmlElement;
	}
	
	getBuffedTotalDuration() {
		if(this.totalEnergy == 0 || this.energyPerSec == 0) {
			return 0;
		} else {
			return this.totalEnergy/this.getBuffedEnergyPerSec();
		}
	}
	
	getBuffedEnergyPerSec() {
		return this.energyPerSec * this.getBuffMultiplier();
	}
	
	getBuffedHeat() {
		return this.heat * this.getBuffMultiplier()/Math.max(this.numberOfSystems, 1);
	}
	
	getBuffedEnergyStorage() {
		return this.energyStorage * this.getBuffMultiplier();
	}
	
	getBuffMultiplier() {
		return this.buff + 1.0;
	}
	
	toString() {
		return this.name + '('+this.isProcessed+')';
	}
}