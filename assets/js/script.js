
$(document).ready(function() {
	"use strict";

	$("#contact-form").submit(function() {
		var message = $(this).serialize();
		console.log(message);
		$.ajax({
			url: "https://formspree.io/justinclagg@gmail.com", 
			method: "POST",
			data: {message: message},
			dataType: "json"
		});
		$(".form-header").text("Your message has been sent!");
	});
});