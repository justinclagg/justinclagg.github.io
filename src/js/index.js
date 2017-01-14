// Webpack entry

require('../css/main.scss');
const images = require('../img');

$(document).ready(function () {
	'use strict';
	/* Contact Page */
	$('#contact-form').submit(function (event) {
		var name = document.getElementById('name-form'),
			email = document.getElementById('email-form'),
			message = document.getElementById('message-form');

		$.ajax({
			url: 'https://formspree.io/justinclagg@gmail.com',
			method: 'POST',
			data: {
				name: name.value,
				_replyto: email.value,
				message: message.value
			},
			dataType: 'json'
		}).done(function () {
			// $('.form-header').text('Your message has been sent!');
			$('.form-message').text('Thanks for reaching out! I\'ll get back to you as soon as possible.');
			name.value = email.value = message.value = '';
		}).fail(function () {
			// $('.form-header').text('Sorry, there was an error!');
			$('.form-message').text('There was an error. Please make sure all fields are filled out correctly.');
		});

		event.preventDefault();  // Prevents page reload
	});

});

/* About Page */
// $(window).on('load', function () {
// 	$('#logo-col').removeClass('hidden');
// });