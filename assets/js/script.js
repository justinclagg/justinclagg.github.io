
$(document).ready(function() {
	"use strict";

	$("#contact-form").submit(function() {

		var name = document.getElementById("name-form"),
			email = document.getElementById("email-form"),
			message = document.getElementById("message-form");

		$.ajax({
			url: "//formspree.io/justinclagg@gmail.com", 
			method: "POST",
			data: {
				name: name.value,
				_replyto: email.value,
				message: message.value
			},
			dataType: "json"
		});

		$(".form-header").text("Your message has been sent!");
		name.value = email.value = message.value = "";

		return false;  // Prevents page reload
	});

});