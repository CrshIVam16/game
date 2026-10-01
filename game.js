"use strict";

const BOARD_SIZE = 20;
const POINTS_PER_FOOD = 10;
const START_SPEED = 150;
const MIN_SPEED = 65;
const SPEED_STEP = 3;

const board = document.querySelector("#game-board");
const scoreDisplay = document.querySelector("#score");
const highScoreDisplay = document.querySelector("#high-score");
const statusLabel = document.querySelector("#game-status-label");
const overlay = document.querySelector("#board-overlay");
const overlayIcon = document.querySelector("#overlay-icon");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");
const overlayStart = document.querySelector("#overlay-start");
const startButton = document.querySelector("#start-button");
const pauseButton = document.querySelector("#pause-button");
const restartButton = document.querySelector("#restart-button");
const announcer = document.querySelector("#announcer");

const cells = [];
for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i += 1) {
  const cell = document.createElement("span");
  cell.className = "cell";
  cell.setAttribute("aria-hidden", "true");
  board.append(cell);
  cells.push(cell);
}

const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let snake;
let direction;
let nextDirection;
let food;
let score;
let highScore = loadHighScore();
let gameState = "ready";
let gameTimer = null;

function loadHighScore() {
  try {
    const stored = Number(localStorage.getItem("neon-snake-high-score"));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch (error) {
    console.warn("Unable to read the saved high score.", error);
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem("neon-snake-high-score", String(highScore));
  } catch (error) {
    console.warn("Unable to save the high score.", error);
  }
}

function resetGame() {
  clearTimeout(gameTimer);
  snake = [
    { x: 9, y: 10 },
    { x: 8, y: 10 },
    { x: 7, y: 10 },
  ];
  direction = directions.right;
  nextDirection = direction;
  score = 0;
  food = placeFood();
  updateScore();
  render();
}

function placeFood() {
  const emptyCells = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!snake.some((segment) => segment.x === x && segment.y === y)) {
        emptyCells.push({ x, y });
      }
    }
  }
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function updateScore() {
  scoreDisplay.textContent = String(score).padStart(3, "0");
  highScoreDisplay.textContent = String(highScore).padStart(3, "0");
}

function render() {
  for (const cell of cells) cell.className = "cell";

  snake.forEach((segment, index) => {
    const cell = cells[segment.y * BOARD_SIZE + segment.x];
    cell.classList.add("snake");
    if (index === 0) cell.classList.add("snake-head");
  });

  if (food) cells[food.y * BOARD_SIZE + food.x].classList.add("food");

  const stateLabels = {
    ready: "READY",
    playing: "IN PLAY",
    paused: "PAUSED",
    over: "GAME OVER",
  };
  statusLabel.textContent = stateLabels[gameState];
  board.setAttribute("aria-label", `Snake game board, ${stateLabels[gameState].toLowerCase()}, score ${score}.`);
}

function setOverlay(visible, icon, title, message, buttonText) {
  overlay.classList.toggle("is-hidden", !visible);
  if (!visible) return;
  overlayIcon.textContent = icon;
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlayStart.textContent = buttonText;
}

function setState(state) {
  gameState = state;
  pauseButton.disabled = state !== "playing" && state !== "paused";
  pauseButton.innerHTML = state === "paused" ? 'Resume <span aria-hidden="true">▶</span>' : 'Pause <span aria-hidden="true">Ⅱ</span>';
  startButton.innerHTML = state === "paused" ? 'Resume <span aria-hidden="true">↗</span>' : 'Start game <span aria-hidden="true">↗</span>';
  render();
}

function startGame() {
  if (gameState === "playing") return;
  if (gameState === "over") resetGame();
  setState("playing");
  setOverlay(false);
  announcer.textContent = "Game started. Use the arrow keys or W, A, S, D to move.";
  scheduleTick();
}

function pauseGame() {
  if (gameState === "playing") {
    clearTimeout(gameTimer);
    setState("paused");
    setOverlay(true, "Ⅱ", "Taking a breather?", "Your run is paused. Pick up right where you left off.", "Resume game");
    announcer.textContent = "Game paused.";
  } else if (gameState === "paused") {
    startGame();
  }
}

function restartGame() {
  resetGame();
  setState("playing");
  setOverlay(false);
  announcer.textContent = "New game started.";
  scheduleTick();
}

function scheduleTick() {
  clearTimeout(gameTimer);
  const speed = Math.max(MIN_SPEED, START_SPEED - Math.floor(score / 50) * SPEED_STEP);
  gameTimer = setTimeout(tick, speed);
}

function tick() {
  if (gameState !== "playing") return;
  direction = nextDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const eating = food && head.x === food.x && head.y === food.y;
  const bodyToCheck = eating ? snake : snake.slice(0, -1);

  if (
    head.x < 0 || head.x >= BOARD_SIZE ||
    head.y < 0 || head.y >= BOARD_SIZE ||
    bodyToCheck.some((segment) => segment.x === head.x && segment.y === head.y)
  ) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (eating) {
    score += POINTS_PER_FOOD;
    if (score > highScore) {
      highScore = score;
      saveHighScore();
    }
    food = placeFood();
    updateScore();
    announcer.textContent = `Score ${score}.`;
  } else {
    snake.pop();
  }

  render();
  if (!food) {
    endGame(true);
    return;
  }
  scheduleTick();
}

function endGame(won = false) {
  clearTimeout(gameTimer);
  setState("over");
  const title = won ? "You cleared the board!" : "Run over.";
  const message = won
    ? `Incredible run. You finished with ${score} points.`
    : `You scored ${score} ${score === 10 ? "point" : "points"}. Ready for another run?`;
  setOverlay(true, won ? "✦" : "↻", title, message, "Play again");
  announcer.textContent = won ? "You won. The board is full." : `Game over. Final score: ${score}.`;
}

function changeDirection(name) {
  const requested = directions[name];
  if (!requested || gameState === "over") return;
  if (requested.x + direction.x === 0 && requested.y + direction.y === 0) return;
  nextDirection = requested;
}

const keyDirections = {
  ArrowUp: "up",
  w: "up",
  W: "up",
  ArrowDown: "down",
  s: "down",
  S: "down",
  ArrowLeft: "left",
  a: "left",
  A: "left",
  ArrowRight: "right",
  d: "right",
  D: "right",
};

document.addEventListener("keydown", (event) => {
  const directionName = keyDirections[event.key];
  if (directionName) {
    event.preventDefault();
    changeDirection(directionName);
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (gameState === "ready") startGame();
    else pauseGame();
  } else if (event.key.toLowerCase() === "r") {
    restartGame();
  }
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => changeDirection(button.dataset.direction));
});

startButton.addEventListener("click", startGame);
overlayStart.addEventListener("click", () => {
  if (gameState === "over") resetGame();
  startGame();
});
pauseButton.addEventListener("click", pauseGame);
restartButton.addEventListener("click", restartGame);

resetGame();
updateScore();
setOverlay(true, "▶", "Ready when you are", "Collect the glowing orbs. Don't run into yourself.", "Start game");
