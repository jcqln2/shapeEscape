/**Initialize game global variables */
var svg = document.getElementById("game");
var scoreOutput = document.getElementById("score");

var score = 0;
var gameLoopInterval;

var width = 1600;
var height = 600;

//start player at centre
var playerX = 800;
var playerY = 300;
var playerSize = 28;
var playerSpeed = 6;

var speedBoost = false;
var boostTimer = null;

var player = null;

var appleX = 0;
var appleY = 0;
var appleExists = false;
var apple = null;
var appleStem = null;

var enemies = [];
//to control difficulty, cap enemies for non-hard levels
var maxEnemies = 20;
//track state of keys- game uses arrow up, arrow down, side arrows
var keys = {};
//capture difficulty ranging from 0-2 for game challenge element
var slider = document.getElementById("difficulty-slider");

var startButton = document.getElementById("start-button");
var gameOver = document.getElementById("game-over");
var finalScore = document.getElementById("final-score");
var restartButton = document.getElementById("restart-button");
var gameStarted = false;
var instructions = document.getElementById("instructions");

// music clip from https://www.chosic.com/download-audio/31973/
var music = document.getElementById("music");

var lastClearScore = 0;

//event listeners for keys used when pressed down and up
document.onkeydown = function (e) {
  keys[e.key] = true;
};
document.onkeyup = function (e) {
  keys[e.key] = false;
};
/**start game, initialize game variables and hide instructions*/
startButton.onclick = function () {
  if (music) {
    music.play();
  }
  gameStarted = true;
  startButton.remove();
  instructions.style.display = "none";
  createBorder();
  createPlayer();
  startGameLoop();
};
/**reload game when restart button clicked*/
restartButton.onclick = function () {
  window.location.reload();
};
/**
 * game area border used when starting game
 * */
function createBorder() {
  var border = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  border.setAttribute("x", 0);
  border.setAttribute("y", 0);
  border.setAttribute("width", width);
  border.setAttribute("height", height);
  border.setAttribute("class", "border");
  svg.appendChild(border);
}
/**
 * create player as an svg polygon to look like a triangle
 * */
function createPlayer() {
  player = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  updatePlayer();
  player.setAttribute("class", "player");
  svg.appendChild(player);
}

/**
 * The top vertex is directly above the center of the player (playerX, playerY), at a distance of playerSize,
The bottom vertices are placed symmetrically on the left and right sides of the top vertex, 
each shifted by 70% of the player’s size.
reference: https://www.w3schools.com/graphics/tryit.asp?filename=trysvg_polygon
Updates the points attribute of the player’s SVG polygon to reflect its current position
*/
function updatePlayer() {
  var points = [
    playerX + "," + (playerY - playerSize),
    playerX + playerSize * 0.7 + "," + (playerY + playerSize * 0.7),
    playerX - playerSize * 0.7 + "," + (playerY + playerSize * 0.7),
  ].join(" ");
  player.setAttribute("points", points);
}
/**
 *
 * @param {*} type is the shape the enemy will be (square, triangle, diamond)
 * @param {*} x is the x-coordinate where the enemy will be placed in the SVG
 * @param {*} y is the y-coordinate where the enemy will be placed in the SVG
 * @param {*} size is size of the enemy shape (used for dimensions like width, height, or to calculate points)
 */
function createEnemy(type, x, y, size) {
  var element;
  if (type == "square") {
    element = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    element.setAttribute("x", x);
    element.setAttribute("y", y);
    element.setAttribute("width", size);
    element.setAttribute("height", size);
    element.setAttribute("class", "square");
  } else if (type == "triangle") {
    element = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    var cx = x + size / 2;
    var cy = y + size / 2;
    //combine the points into single string
    var points = [
      cx + "," + (cy - size / 2),
      cx + (size / 2) * 0.7 + "," + (cy + (size / 2) * 0.7),
      cx - (size / 2) * 0.7 + "," + (cy + (size / 2) * 0.7),
    ].join(" ");
    element.setAttribute("points", points);
    element.setAttribute("class", "triangle");
  } else if (type == "diamond") {
    //diamond shape was more complicated to draw
    element = document.createElementNS("http://www.w3.org/2000/svg", "path");
    var half = size / 2;
    var data =
      "M" +
      (x + half) +
      "," +
      y +
      " L" +
      (x + size) +
      "," +
      (y + half) +
      " L" +
      (x + half) +
      "," +
      (y + size) +
      " L" +
      x +
      "," +
      (y + half) +
      " Z";
    element.setAttribute("d", data);
    element.setAttribute("class", "diamond");
  }
  svg.appendChild(element);
  return element;
}
/**
 * Creates a new enemy with a random shape (square, triangle, or diamond) at a random position
 * Implements the difficulty level by limiting enemy count (except on hard mode) and scaling enemy size based on game score
 * Makes sure enemies spawn at least 200 pixels away from the player to avoid dying right away
 * @see createEnemy
 */
function makeEnemy() {
  var sliderValue = parseInt(slider.value);
  // only apply maxEnemies limit if not on hard difficulty (sliderValue != 2)
  if (sliderValue !== 2 && enemies.length >= maxEnemies) {
    // don't create new enemies if limit is reached on easy/medium
    return;
  }

  var random = Math.floor(Math.random() * 3);
  var type;
  if (random == 0) type = "square";
  if (random == 1) type = "triangle";
  if (random == 2) type = "diamond";
  // determine enemy size based on score milestones
  var milestones = Math.floor(score / 1000);
  // increase size by 10 for each 1000-point milestone
  var enemySize = 32 + milestones * 10;
  // calculate spawn position (random across game area, but not too close to player)
  var x, y, dist;
  do {
    x = Math.random() * (width - enemySize * 2) + enemySize;
    y = Math.random() * (height - enemySize * 2) + enemySize;
    // calculate distance from spawn point to player
    dist = Math.sqrt(Math.pow(playerX - x, 2) + Math.pow(playerY - y, 2));
    // spawn at least 200 pixels away from player relative to enemy size
  } while (dist < 200 + enemySize / 2);
  var element = createEnemy(type, x, y, enemySize);
  var newEnemy = {
    type: type,
    x: x,
    y: y,
    size: enemySize,
    element: element,
  };
  enemies.push(newEnemy);
}

/**
 * Creates new apple at random positions within the game area and adds it to the SVG canvas
 */
function createApple() {
  appleX = Math.random() * (width - 32) + 16;
  appleY = Math.random() * (height - 32) + 16;
  apple = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  apple.setAttribute("cx", appleX);
  apple.setAttribute("cy", appleY);
  apple.setAttribute("r", 16);
  apple.setAttribute("class", "apple");
  svg.appendChild(apple);
  appleStem = document.createElementNS("http://www.w3.org/2000/svg", "line");
  appleStem.setAttribute("x1", appleX);
  appleStem.setAttribute("y1", appleY - 16);
  appleStem.setAttribute("x2", appleX);
  appleStem.setAttribute("y2", appleY - 26);
  appleStem.setAttribute("class", "apple-stem");
  svg.appendChild(appleStem);
  appleExists = true;
}
/**
 * Moves the player based on arrow key inputs and applies a speed boost if active
 * Updates the player's position (playerX, playerY) while ensuring it stays within the game boundaries
 * Calls updatePlayer() to reflect new position of player in game
 */
function movePlayer() {
  if (!player){
    return;
  }
  var speed;
  if (speedBoost) {
    speed = 12;
  } else {
    speed = playerSpeed;
  }
  if (keys["ArrowUp"]) playerY = playerY - speed;
  if (keys["ArrowDown"]) playerY = playerY + speed;
  if (keys["ArrowLeft"]) playerX = playerX - speed;
  if (keys["ArrowRight"]) playerX = playerX + speed;
  if (playerX < 0) playerX = 0;
  if (playerX > width) playerX = width;
  if (playerY < 0) playerY = 0;
  if (playerY > height) playerY = height;
  updatePlayer();
}
/**
 * Updates the position of all enemies in the game to chase the player
 * + handles their rendering and checks for collisions or out-of-bounds conditions
 */
function moveEnemies() {
  var sliderValue = parseInt(slider.value);
  var enemySpeed = 1.0 + sliderValue * 0.5;
  for (var i = 0; i < enemies.length; i++) {
    var enemy = enemies[i];
    var dx = playerX - (enemy.x + enemy.size / 2);
    var dy = playerY - (enemy.y + enemy.size / 2);
    var dist = Math.sqrt(dx * dx + dy * dy);
    var vx = (dx / dist) * enemySpeed;
    var vy = (dy / dist) * enemySpeed;
    enemy.x = enemy.x + vx;
    enemy.y = enemy.y + vy;

    if (enemy.type == "square") {
      enemy.element.setAttribute("x", enemy.x);
      enemy.element.setAttribute("y", enemy.y);
    } else if (enemy.type == "triangle") {
      var cx = enemy.x + enemy.size / 2;
      var cy = enemy.y + enemy.size / 2;
      var points = [
        cx + "," + (cy - enemy.size / 2),
        cx + (enemy.size / 2) * 0.7 + "," + (cy + (enemy.size / 2) * 0.7),
        cx - (enemy.size / 2) * 0.7 + "," + (cy + (enemy.size / 2) * 0.7),
      ].join(" ");
      enemy.element.setAttribute("points", points);
    } else if (enemy.type == "diamond") {
      var half = enemy.size / 2;
      var d =
        "M" +
        (enemy.x + half) +
        "," +
        enemy.y +
        " L" +
        (enemy.x + enemy.size) +
        "," +
        (enemy.y + half) +
        " L" +
        (enemy.x + half) +
        "," +
        (enemy.y + enemy.size) +
        " L" +
        enemy.x +
        "," +
        (enemy.y + half) +
        " Z";
      enemy.element.setAttribute("d", d);
    }

    if (dist < enemy.size / 2 + playerSize * 0.7) {
      finalScore.innerHTML = score;
      gameOver.style.display = "block";
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      enemies = [];
      if (appleExists) {
        apple = null;
        appleStem = null;
        appleExists = false;
      }
      gameStarted = false;
      stopGameLoop(); 
    }
    if (
      enemy.x < -enemy.size ||
      enemy.x > width ||
      enemy.y < -enemy.size ||
      enemy.y > height
    ) {
      enemy.element.remove();
      enemies.splice(i, 1);
      i--;
    }
  }
}

/**
 * Checks if a player collides with an apple in the game.
 * If a collision happens, this function removes the apple and triggers a speed boost for the player.
 */
function checkApple() {
  if (appleExists) {
    var dx = playerX - appleX;
    var dy = playerY - appleY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < playerSize * 0.7 + 16) {
      apple.remove();
      appleStem.remove();
      apple = null;
      appleStem = null;
      appleExists = false;
      speedBoost = true;
      if (boostTimer) clearTimeout(boostTimer);
      boostTimer = setTimeout(function () {
        speedBoost = false;
      }, 5000);
    }
  }
}
/**
 * Starts the game loop, running at 60 FPS and ensures an apple spawns right away
 * Clears any existing game loop interval before starting a new one
 */
function startGameLoop() {
  if (gameLoopInterval) clearInterval(gameLoopInterval); // Clear existing interval
  // Force an initial apple spawn at game start
  if (!appleExists) {
    createApple();
  }
  gameLoopInterval = setInterval(gameLoop, 1000 / 60); // Run at 60 FPS
}
/**
 * Stops the game loop by clearing the active interval
 */
function stopGameLoop() {
  clearInterval(gameLoopInterval);
}

/**
 * Updates the game state at each frame (frames updates 60 times /second)
 * Manages player movement, enemy spawning and movement, apple spawning, collision detection, and score updates
 * Adjusts spawn rates based on difficulty and clears enemies at score milestones (except on hard mode)
 */
function gameLoop() {
  if (!gameStarted) {
    stopGameLoop();
    return;
  }
  var sliderValue = parseInt(slider.value);
  var appleChance;
  if (sliderValue === 0) {
    appleChance = 0.15; 
  } else if (sliderValue === 1) {
    appleChance = 0.01; // Medium
  } else {
    appleChance = 0.05; 
  }
  movePlayer();
  if (
    sliderValue !== 2 &&
    score > lastClearScore + 1000 &&
    enemies.length > 0
  ) {
    for (var i = 0; i < enemies.length; i++) {
      enemies[i].element.remove();
    }
    enemies = [];
    lastClearScore = Math.floor(score / 1000) * 1000;
  }
  var enemySpawnRate;
  if (sliderValue === 0) {
    enemySpawnRate = 0.005; 
  } else if (sliderValue === 1) {
    enemySpawnRate = 0.01; 
  } else {
    enemySpawnRate = 0.015; 
  }
  if (Math.random() < enemySpawnRate) makeEnemy();
  moveEnemies();
  // check for apple state mismatch
  if (
    appleExists &&
    (!apple || !apple.parentNode || !appleStem || !appleStem.parentNode)
  ) {
    if (apple) apple.remove();
    if (appleStem) appleStem.remove();
    apple = null;
    appleStem = null;
    appleExists = false;
  }
  // only spawn a new apple if none exists
  if (!appleExists && Math.random() < appleChance) {
    createApple();
  }
  checkApple();
  score = score + 1;
  scoreOutput.innerHTML = "Score: " + score;
}
