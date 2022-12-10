/* Toggle between hiding and showing the dropdown on button click. Hides other elements dropdowns. */
function toggleDropdown(elementId) {
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
	var dropdowns = document.getElementsByClassName("dropdown-content");
	var i;
	for (i = 0; i < dropdowns.length; i++) {
		var openDropdown = dropdowns[i];
		if (openDropdown.classList.contains('show')) {
			openDropdown.classList.remove('show');
		}
	}
}

// Set a cells style to a specific style.
function setComponent(forCellId, styleClass) {
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

function createComponentsFromHtml() {
	
}