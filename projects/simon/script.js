"use strict";

var gameState = {
	"status": "off",
	"strict": false,
	"userStep": 0,
	"maxRounds": 20,
	"roundNum": document.getElementById("roundNum"),
	"sequence": []
};

var sound1 = new Audio("https://s3.amazonaws.com/freecodecamp/simonSound1.mp3"),
	sound2 = new Audio("https://s3.amazonaws.com/freecodecamp/simonSound2.mp3"),
	sound3 = new Audio("https://s3.amazonaws.com/freecodecamp/simonSound3.mp3"),
	sound4 = new Audio("https://s3.amazonaws.com/freecodecamp/simonSound4.mp3");
var sounds = [sound1, sound2, sound3, sound4];

var greenBtn = document.getElementById("green"),
	redBtn = document.getElementById("red"),
	yellowBtn = document.getElementById("yellow"),
	blueBtn = document.getElementById("blue"),
	strictBtn = document.getElementById("strictBtn");

// Each button element with it's associated number key
var buttons = {
	"0": greenBtn,
	"1": redBtn,
	"2": yellowBtn,
	"3": blueBtn
};

// Click events
document.getElementById("startBtn").addEventListener("click", newGame);
document.getElementById("resetBtn").addEventListener("click", restartGame);
strictBtn.addEventListener("click", strictMode);
greenBtn.addEventListener("mousedown", function(){userClick(0)});
redBtn.addEventListener("mousedown", function(){userClick(1)});
yellowBtn.addEventListener("mousedown", function(){userClick(2)});
blueBtn.addEventListener("mousedown", function(){userClick(3)});


function newGame() {
	if (gameState.status === "off") {
		inialize();
		addStep();	// Initial step
		setTimeout(playSequence, 2000);
	}
}

function restartGame() {
	if (gameState.status === "on") {
		inialize();
		addStep();	// Initial step
		setTimeout(playSequence, 2000);
	}
}

function strictMode() {
	if (gameState.strict) {
		gameState.strict = false;
		strictBtn.classList.remove("active");
	} else {
		gameState.strict = true;
		strictBtn.classList.add("active");
	}
}

function inialize() {
	gameState.status = "on";
	gameState.userStep = 0;
	gameState.sequence = [];

}

// Add a random number (0-3)
function addStep() {
	gameState.sequence.push(Math.floor(Math.random() * 4));
	gameState.roundNum.innerHTML = gameState.sequence.length;
}

function playSequence() {
	for (var i = 0; i < gameState.sequence.length; i++) {
		setTimeout(animateButton, i * 1000, gameState.sequence[i]);
	}
}

function animateButton(key) {
	sounds[key].play();
	buttons[key].style.opacity = "1";
	setTimeout(function unclick(){buttons[key].style.opacity = "0.6"}, 300);
}

function userClick(key) {
	animateButton(key);
	// The sequence was completed successfully
	if (key === gameState.sequence[gameState.userStep] && gameState.userStep === gameState.sequence.length - 1) {
		// User wins after round 20
		if (gameState.sequence.length === gameState.maxRounds) {
			return winner();
		}
		// Start next round
		addStep();
		setTimeout(playSequence, 2000);
		gameState.userStep = 0;
		return;
	// The user input is correct, but there is more in the sequence
	} else if (key === gameState.sequence[gameState.userStep]) {
		gameState.userStep++;
		return;
	// User input is incorrect, try the sequence again
	} else {
		if (gameState.strict) {
			alert("Game over! Start again.");
			gameState.status = "off";
			newGame();
		} else {
			alert("Try again!");
			setTimeout(playSequence, 1500);
			gameState.userStep = 0;
			return;
		}
	}
}

function winner() {
	alert("20 rounds completed. You've won!");
	gameState.status = "off";
	newGame();
}
