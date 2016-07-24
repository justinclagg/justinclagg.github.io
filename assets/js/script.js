$(document).ready(function() {
	"use strict";

	var activeNav = "#portfolio-nav";

	// Change active page
	$("#nav-links > ul> li > a").click(function() {
		$(activeNav).removeClass("active-nav");
		$(this).addClass("active-nav");
		activeNav = "#" + $(this).attr("id");
	});







	// Place current year in footer
	var dateVal = new Date();
	var yearVal = dateVal.getFullYear();
	$("#current-year").text(yearVal);
});