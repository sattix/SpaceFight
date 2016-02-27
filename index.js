//settings
var playAreaWidth = 640; //640
var playAreaHeight = 360; //360
var scoreHeight = 40;
var statsHeight = 40;
var speed = 25; // 17 -> ~60 fps
var pixelSize = 10;
var backgroundArea = "darkgray";
var maxhealth = 10;

//sizes
var shipHeight = 64;
var shipWidth = 64;

var enemy1Width = 57;
var enemy1Height = 40;

var upgradeWidth = 22;
var upgradeHeight = 22;

var backgroundHeight = 800;
var backgroundWidth = 2560;


//classes
function Point(x, y) {
	this.x = x;
	this.y = y;
}

function Rect(position, width, height) {
	this.position = position;
	this.width = width;
	this.height = height;
}

function Ship(hp, position, width, height) {
	this.hp = hp;
	this.position = position;
	this.width = width;
	this.height = height;
}

function Shot(position, shotType, damage) {
	this.position = position;
	this.shotType = shotType;
	this.damage = damage;
}

//game vars
var level = 1;
var score = 0;
var playerShip;
var enemyShips = [];
var shots = [];
var pressedKeys = [];
var tick = 0;
var gameTimer = undefined;
var upgradePosition = undefined;
var backgroundPosition = undefined;
var backgroundPosition2 = undefined;
var shotSpeed;
var shipSpeed;
var enemy1Speed;
var backgroundSpeed;

function initGame() {
	document.removeEventListener("keydown", keyDown);
	document.removeEventListener("keyup", keyUp);
	//register key events
	document.addEventListener("keydown", keyDown);
	document.addEventListener("keyup", keyUp);
	
	//draw to svg area
	var drawArea = document.getElementById("svgArea");
	drawArea.setAttribute("width", playAreaWidth);
	drawArea.setAttribute("height", playAreaHeight + scoreHeight + statsHeight);
	drawArea.innerHTML = "";
	
	//reset game vars
	playerShip = new Ship(maxhealth, new Point(15, scoreHeight + (playAreaHeight / 2) - (shipHeight / 2)), shipWidth, shipHeight);
	playerShip.currentShot = "basicShot";
	level = 1;
	score = 0;
	enemyShips = [];
	shots = [];
	pressedKeys = [];
	tick = 0;
	upgradePosition = undefined;
	backgroundPosition = new Point(0, 0);
	backgroundPosition2 = new Point(backgroundWidth, 0);
	
	//speeds
	shotSpeed = speed * 0.7;
	shipSpeed = speed * 0.3;
	enemy1Speed = speed * 0.1;
	backgroundSpeed = speed * 0.25;
		
	//main game loop
	gameTimer = setInterval(updateUI, speed);
}

function updateUI() {
	tick++;
	tick = tick % 10000;
	
	var spawnFactor;
	switch(level) {
		case 1: spawnFactor = 180; break;
		case 2: spawnFactor = 130; break;
		case 3: spawnFactor = 80; break;
	}
	
	if ((tick % spawnFactor) == 0) {
		spawnEnemy();
	}
	
	calcBackroundPosition();
	moveShipOnKeys();
	calcShotPositions();
	calcEnemyPositions();
	
	getSVGArea().innerHTML = "";
	drawBackgrounds();
	drawShip();
	drawShots();
	drawEnemies();
	drawUpgrade();
	
	//after drawing -> game ends?
	checkHealth();
}

function calcShotPositions() {
	for (var i = 0; i < shots.length; i++) {
		if (shots[i].position.x > playAreaWidth) {
			//out of play area
			shots.remove(i);
			i--;
		}
		else {
			shots[i].position.x += shotSpeed;
			var rectProjectile = new Rect(shots[i].position, 12, 1);
			
			//check if shot hit enemy
			for (var j = 0; j < enemyShips.length; j++) {
				var rectEnemyShip = new Rect(enemyShips[j].position, enemyShips[j].width, enemyShips[j].height);
				
				if (isHit(rectProjectile, rectEnemyShip)) {
					//projectile hit
					enemyShips[j].hp -= shots[i].damage;
					
					shots.remove(i);
					i--;
					if (enemyShips[j].hp <= 0) {
						//enemy ship dies
						score++;
						updateLevel();
						spawnUpgrade(enemyShips[j].position);
						enemyShips.remove(j);
						j--;
					}
				}
			}	
		}
	}
}

function calcEnemyPositions() {
	var shipRect = getShipRect();
	for (var i = 0; i < enemyShips.length; i++) {
		if ((enemyShips[i].position.x < enemyShips[i].width * -1) ||
			isHit(shipRect, new Rect(enemyShips[i].position, enemyShips[i].width, enemyShips[i].height))) {
			//enemy hit left border
			enemyShips.remove(i);
			i--;
			playerShip.hp--;
		}
		else {
			enemyShips[i].position.x -= enemy1Speed;
		}
	}
}

function calcBackroundPosition() {
	backgroundPosition.x = (((backgroundPosition.x * -1) + backgroundSpeed)) * -1;
    backgroundPosition2.x = (((backgroundPosition2.x * -1) + backgroundSpeed)) * -1;
    
    if (backgroundPosition.x * -1 >= backgroundWidth) {
        backgroundPosition.x = backgroundPosition2.x + backgroundWidth;
    }
     
    if (backgroundPosition2.x * -1 >= backgroundWidth) {
        backgroundPosition2.x = backgroundPosition.x + backgroundWidth;
    }
}

function moveShipOnKeys() {
	for (var i = 0; i < pressedKeys.length; i++) {
		switch(pressedKeys[i]) {
			case 37: //arrow left
				if (playerShip.position.x > 0) {	
					playerShip.position.x -= shipSpeed;
				}	
			break;
			case 38: //arrow up
				if (playerShip.position.y > scoreHeight) {
					playerShip.position.y -= shipSpeed;	
				}
			break;
			case 39: //arrow right
				if (playerShip.position.x < (playAreaWidth - shipWidth)) {
					playerShip.position.x += shipSpeed;
				}
			break;
			case 40: //arrow down
				if (playerShip.position.y < (playAreaHeight + scoreHeight - shipHeight)) {
					playerShip.position.y += shipSpeed;
				}
			break;	
			case 32: //space
				if (tick % 20 == 0) {
					var shotPoint = new Point(playerShip.position.x + playerShip.width, playerShip.position.y + playerShip.height / 2); 
					if (playerShip.currentShot == "basicShot") {
						shots.push(new Shot(shotPoint, "basicShot", 1));		
					} 
					else if (playerShip.currentShot == "advancedShot") {
						shots.push(new Shot(shotPoint, "advancedShot", 3));
					}
				}
			break;
		}
	}
	
	if (upgradePosition != undefined && 
		isHit(getShipRect(), new Rect(upgradePosition, upgradeWidth, upgradeHeight))) {
		//upgrade ship
		playerShip.currentShot = "advancedShot";
		upgradePosition = undefined;
	}
}

function spawnEnemy() {
	var position = new Point(playAreaWidth, ((Math.random() * 1000) % 
		(playAreaHeight - playerShip.height))       //bottom
		+ scoreHeight + (playerShip.height / 2));   //top
	enemyShips.push(new Ship(3, position, enemy1Width, enemy1Height));
}

function spawnUpgrade(position) {
	if (score == 18) {
		//upgrade 1
		upgradePosition = position;
	} else if (score == 40) {
		//upgrade 2
        //upgradePosition = position;
    }
}

function keyDown(e) {
	var key = e.which | e.keyCode;
	if (pressedKeys.indexOf(key) == -1) {
		pressedKeys.push(key);	
	}
}

function keyUp(e) {
	var key = e.which | e.keyCode;
	if (pressedKeys.indexOf(key) != -1) {
		pressedKeys.remove(pressedKeys.indexOf(key));
	}
}

function playAgainClick(e) {
	initGame();
}

//DRAW
function drawBackgrounds() {
	var background = document.createElementNS("http://www.w3.org/2000/svg", "use");
	background.setAttribute("height", backgroundHeight);
	background.setAttribute("width", backgroundWidth);
	background.setAttribute("y", backgroundPosition.y);
	background.setAttribute("x", backgroundPosition.x);
	background.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#background");
	getSVGArea().appendChild(background);
		
	var background2 = document.createElementNS("http://www.w3.org/2000/svg", "use");
	background2.setAttribute("height", backgroundHeight);
	background2.setAttribute("width", backgroundWidth);
	background2.setAttribute("y", backgroundPosition2.y);
	background2.setAttribute("x", backgroundPosition2.x);
	background2.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#background");
	getSVGArea().appendChild(background2);
		
	var scoreBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	scoreBackground.setAttribute("width", playAreaWidth);
	scoreBackground.setAttribute("height", scoreHeight);
	scoreBackground.style.fill = "lightgray";
	getSVGArea().appendChild(scoreBackground);
	
	var scoreText = document.createElementNS("http://www.w3.org/2000/svg", "text");
	scoreText.setAttribute("x", 5);
	scoreText.setAttribute("y", 25);
	scoreText.textContent = "Score: " + score;
	scoreText.setAttribute("style", "font-family: 'Audiowide', cursive; font-weight: bold;");
	getSVGArea().appendChild(scoreText);
	
	var levelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
	levelText.setAttribute("x", playAreaWidth - 5);
	levelText.setAttribute("y", 25);
	levelText.setAttribute("text-anchor", "end");
	levelText.setAttribute("style", "font-family: 'Audiowide', cursive; font-weight: bold;");
	levelText.textContent = "Level: " + level;
	getSVGArea().appendChild(levelText);
	
	var statsBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	statsBackground.setAttribute("width", playAreaWidth);
	statsBackground.setAttribute("height", statsHeight);
	statsBackground.setAttribute("y", scoreHeight + playAreaHeight);
	statsBackground.style.fill = "lightgray";
	getSVGArea().appendChild(statsBackground);
	
	var healthBarBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	healthBarBackground.setAttribute("width", 200);
	healthBarBackground.setAttribute("height", statsHeight - 10);
	healthBarBackground.setAttribute("x", 5);
	healthBarBackground.setAttribute("y", scoreHeight + playAreaHeight + 5);
	healthBarBackground.style.fill = "darkgray";
	getSVGArea().appendChild(healthBarBackground);
	
	
	var healthBar = document.createElementNS("http://www.w3.org/2000/svg", "rect");	
	healthBar.setAttribute("height", statsHeight - 10);
	healthBar.setAttribute("width", Math.max(200 * (playerShip.hp / maxhealth), 0));
	healthBar.setAttribute("x", 5);
	healthBar.setAttribute("y", scoreHeight + playAreaHeight + 5);
	healthBar.style.fill = "black";
	getSVGArea().appendChild(healthBar);
}

function drawShip() {
	var ship = document.createElementNS("http://www.w3.org/2000/svg", "use");
	ship.setAttribute("x", playerShip.position.x);
	ship.setAttribute("y", playerShip.position.y);
	ship.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#ship");
	getSVGArea().appendChild(ship);
}

function drawShots() {
	for (var i = 0; i < shots.length; i++) {
		var shot = document.createElementNS("http://www.w3.org/2000/svg", "use");
		shot.setAttribute("x", shots[i].position.x);
		shot.setAttribute("y", shots[i].position.y);
		if (shots[i].shotType == "basicShot") {
			shot.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#basicShot");
		} 
		else if (shots[i].shotType == "advancedShot") {
			shot.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#advancedShot");
		}
		getSVGArea().appendChild(shot);
	}
}

function drawEnemies() {
	for (var i = 0; i < enemyShips.length; i++) {
		var enemy = document.createElementNS("http://www.w3.org/2000/svg", "use");		
		enemy.setAttribute("x", enemyShips[i].position.x);
		enemy.setAttribute("y", enemyShips[i].position.y);
		enemy.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#enemy1");
		getSVGArea().appendChild(enemy);
	}
}

function drawUpgrade() {
	if (upgradePosition != undefined) {	
		var upgrade = document.createElementNS("http://www.w3.org/2000/svg", "use");		
		upgrade.setAttribute("x", upgradePosition.x);
		upgrade.setAttribute("y", upgradePosition.y);
		upgrade.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#upgrade1");
		getSVGArea().appendChild(upgrade);	
	}
}

function endGame() { 
	clearInterval(gameTimer);
	var messageBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	messageBackground.setAttribute("x", 0);
	messageBackground.setAttribute("y", scoreHeight);
	messageBackground.setAttribute("height", playAreaHeight);
	messageBackground.setAttribute("width", playAreaWidth);
	messageBackground.setAttribute("fill-opacity", "0.80");
	messageBackground.setAttribute("fill", "black");
	getSVGArea().appendChild(messageBackground);
	
	var message = document.createElementNS("http://www.w3.org/2000/svg", "text");
	message.setAttribute("text-anchor", "middle");
	message.setAttribute("style", "font-family: 'Audiowide', cursive; font-weight: bold; color: white; font-size: 35pt;");
	message.setAttribute("x", playAreaWidth / 2);
	message.setAttribute("y", playAreaHeight / 2 + scoreHeight);
	message.textContent = "Game over!";
	message.setAttribute("fill", "white");
	getSVGArea().appendChild(message);
	
	var buttonBackground = document.createElementNS("http://www.w3.org/2000/svg", "rect");
	buttonBackground.setAttribute("width", 100);
	buttonBackground.setAttribute("height", 50);
	buttonBackground.setAttribute("y", 50 + playAreaHeight / 2 + scoreHeight);
	buttonBackground.setAttribute("x", playAreaWidth / 2 - 50);
	buttonBackground.setAttribute("fill", "white");
	buttonBackground.setAttribute("fill-opacity", "0.30");	
	buttonBackground.addEventListener("click", playAgainClick);
	
	
	var playAgainText = document.createElementNS("http://www.w3.org/2000/svg", "text");
	playAgainText.setAttribute("text-anchor", "middle");
	playAgainText.setAttribute("style", "font-family: 'Audiowide', cursive; font-weight: bold; color: white; font-size: 12pt;");
	playAgainText.setAttribute("x", playAreaWidth / 2);
	playAgainText.setAttribute("y", playAreaHeight / 2 + scoreHeight + 80);
	playAgainText.textContent = "play again";
	playAgainText.setAttribute("fill", "white");
	getSVGArea().appendChild(playAgainText);
	getSVGArea().appendChild(buttonBackground);
}


//UTILITIES
function getSVGArea() {
	return document.getElementById("svgArea");
}

function getShipRect() {
	return new Rect(playerShip.position, playerShip.width, playerShip.height);
}

function isHit(rect1, rect2) {
	var b1 = ((rect1.position.y + rect1.height) > rect2.position.y) && (rect1.position.y < (rect2.position.y + rect2.height));
	var b2 = ((rect1.position.x + rect1.width) > rect2.position.x) && (rect1.position.x < (rect2.position.x + rect2.width));
	
	return b1 && b2;
}

function updateLevel() {
	if (score < 10) {
		level = 1;
	}
	else if (score < 20) {
		level = 2;
	} 
	else {
		level = 3;
	}
	
}

function checkHealth() {
	if (playerShip.hp <= 0) {
		endGame();
	}
}

// http://stackoverflow.com/questions/500606/javascript-array-delete-elements
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};