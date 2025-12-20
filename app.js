const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");
const fireButton = document.getElementById("fireButton");
const joystick = document.getElementById("joystick");
const joystickStick = document.getElementById("joystickStick");

startButton.disabled = true;

const images = {
  santa: new Image(),
  tree: new Image(),
  ornament: new Image(),
};

const music = new Audio("Jingle Bells Tonight.mp3");
music.loop = true;
music.volume = 0.4;
let musicPlaying = false;

function toggleMusic() {
  if (musicPlaying) {
    music.pause();
    musicPlaying = false;
  } else {
    music.play().catch(() => {});
    musicPlaying = true;
  }
  updateMusicButton();
}

function updateMusicButton() {
  const btn = document.getElementById("musicButton");
  if (btn) {
    btn.textContent = musicPlaying ? "🔊" : "🔇";
    btn.setAttribute("aria-label", musicPlaying ? "Mute music" : "Play music");
  }
}

function startMusic() {
  if (!musicPlaying) {
    music.play().then(() => {
      musicPlaying = true;
      updateMusicButton();
    }).catch(() => {});
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && musicPlaying) {
    music.pause();
  } else if (!document.hidden && musicPlaying) {
    music.play().catch(() => {});
  }
});

const SCALE = {
  santa: 0.24,
  tree: 0.22,
  ornament: 0.1,
};

let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let score = 0;
let gameState = "loading";

const santa = {
  x: 0,
  y: 0,
  size: 0,
};

const ornaments = [];
const trees = [];

const joystickState = {
  pointerId: null,
  active: false,
  center: { x: 0, y: 0 },
  radius: 0,
  vector: { x: 0, y: 0 },
};

const keyboardState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

let fireCooldown = 0;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateScale();
  updateJoystickBounds();
}

function updateScale() {
  const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  santa.size = unit * SCALE.santa;
  if (gameState === "playing" || gameState === "over") {
    trees.forEach((tree) => {
      tree.size = unit * tree.scale;
    });
    ornaments.forEach((ornament) => {
      ornament.size = unit * ornament.scale;
    });
  }
}

function updateJoystickBounds() {
  const rect = joystick.getBoundingClientRect();
  joystickState.center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  joystickState.radius = rect.width / 2 - 6;
}

function setGameState(state) {
  gameState = state;
  if (state === "playing") {
    overlay.classList.add("hidden");
  } else {
    overlay.classList.remove("hidden");
  }
}

function resetGame() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  santa.x = width * 0.5;
  santa.y = height * 0.78;
  ornaments.length = 0;
  trees.length = 0;
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  fireCooldown = 0;
  scoreEl.textContent = score;
}

function updateDifficulty(dt) {
  elapsed += dt;
}

function spawnTree() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.tree;
  const padding = size * 0.7;
  trees.push({
    x: padding + Math.random() * (width - padding * 2),
    y: -size,
    size,
    scale: SCALE.tree,
    speed: unit * (0.12 + Math.random() * 0.08),
  });
}

function fireOrnament() {
  if (gameState !== "playing" || fireCooldown > 0) {
    return;
  }

  const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  const size = unit * SCALE.ornament;
  ornaments.push({
    x: santa.x,
    y: santa.y - santa.size * 0.55,
    size,
    scale: SCALE.ornament,
    speed: unit * 0.9,
  });
  fireCooldown = 0.35;
}

function updateSanta(dt) {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const unit = Math.min(width, height);
  const moveSpeed = unit * 0.6;

  const inputX = joystickState.vector.x + (keyboardState.right ? 1 : 0) - (keyboardState.left ? 1 : 0);
  const inputY = joystickState.vector.y + (keyboardState.down ? 1 : 0) - (keyboardState.up ? 1 : 0);

  santa.x += inputX * moveSpeed * dt;
  santa.y += inputY * moveSpeed * dt;

  santa.x = Math.min(Math.max(santa.x, santa.size * 0.5), width - santa.size * 0.5);
  santa.y = Math.min(Math.max(santa.y, santa.size * 0.5), height - santa.size * 0.5);
}

function updateOrnaments(dt) {
  ornaments.forEach((ornament) => {
    ornament.y -= ornament.speed * dt;
  });

  for (let i = ornaments.length - 1; i >= 0; i -= 1) {
    if (ornaments[i].y + ornaments[i].size < 0) {
      ornaments.splice(i, 1);
    }
  }
}

function updateTrees(dt) {
  const height = canvas.height / (window.devicePixelRatio || 1);
  const difficulty = 1 + elapsed / 25;
  trees.forEach((tree) => {
    tree.y += tree.speed * difficulty * dt;
  });

  for (let i = trees.length - 1; i >= 0; i -= 1) {
    if (trees[i].y - trees[i].size * 0.4 > height) {
      endGame();
      return;
    }
  }
}

function checkCollisions() {
  for (let i = trees.length - 1; i >= 0; i -= 1) {
    const tree = trees[i];
    const treeRadius = tree.size * 0.35;

    for (let j = ornaments.length - 1; j >= 0; j -= 1) {
      const ornament = ornaments[j];
      const dx = tree.x - ornament.x;
      const dy = tree.y - ornament.y;
      const distance = Math.hypot(dx, dy);
      if (distance < treeRadius + ornament.size * 0.4) {
        trees.splice(i, 1);
        ornaments.splice(j, 1);
        score += 1;
        scoreEl.textContent = score;
        break;
      }
    }
  }
}

function draw() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  ctx.clearRect(0, 0, width, height);

  const groundHeight = height * 0.12;
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.fillRect(0, height - groundHeight, width, groundHeight);

  trees.forEach((tree) => {
    ctx.drawImage(
      images.tree,
      tree.x - tree.size * 0.5,
      tree.y - tree.size * 0.6,
      tree.size,
      tree.size * 1.2
    );
  });

  ornaments.forEach((ornament) => {
    ctx.drawImage(
      images.ornament,
      ornament.x - ornament.size * 0.5,
      ornament.y - ornament.size * 0.5,
      ornament.size,
      ornament.size
    );
  });

  ctx.drawImage(
    images.santa,
    santa.x - santa.size * 0.5,
    santa.y - santa.size * 0.6,
    santa.size,
    santa.size * 1.2
  );
}

function loop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }
  const delta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (gameState === "playing") {
    updateDifficulty(delta);
    fireCooldown = Math.max(0, fireCooldown - delta);
    spawnTimer -= delta;

    const spawnInterval = Math.max(0.45, 1.5 - elapsed * 0.03);
    if (spawnTimer <= 0) {
      spawnTree();
      spawnTimer = spawnInterval;
    }

    updateSanta(delta);
    updateOrnaments(delta);
    updateTrees(delta);
    checkCollisions();
  }

  draw();
  requestAnimationFrame(loop);
}

function endGame() {
  if (gameState !== "playing") {
    return;
  }
  setGameState("over");
  overlayTitle.textContent = "Game Over";
  overlayMessage.textContent = `You cleared ${score} tree${score === 1 ? "" : "s"}. Tap to try again.`;
  startButton.textContent = "Play Again";
}

function startGame() {
  resetGame();
  overlayTitle.textContent = "Ready to Play?";
  overlayMessage.textContent =
    "Move Santa with the joystick. Tap Fire to launch ornaments. Stop the trees before they land.";
  startButton.textContent = "Start";
  setGameState("playing");
  startMusic();
}

function handlePointerMove(event) {
  if (!joystickState.active || joystickState.pointerId !== event.pointerId) {
    return;
  }

  const dx = event.clientX - joystickState.center.x;
  const dy = event.clientY - joystickState.center.y;
  const distance = Math.hypot(dx, dy);
  const max = joystickState.radius;
  const ratio = distance > max ? max / distance : 1;
  const clampedX = dx * ratio;
  const clampedY = dy * ratio;

  joystickState.vector.x = clampedX / max;
  joystickState.vector.y = clampedY / max;
  joystickStick.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
}

function resetJoystick(event) {
  if (event && joystickState.pointerId !== null && event.pointerId !== joystickState.pointerId) {
    return;
  }
  joystickState.active = false;
  joystickState.pointerId = null;
  joystickState.vector.x = 0;
  joystickState.vector.y = 0;
  joystickStick.style.transform = "translate(-50%, -50%)";
}

function handleKeyboard(event, isDown) {
  switch (event.key.toLowerCase()) {
    case "arrowup":
    case "w":
      keyboardState.up = isDown;
      break;
    case "arrowdown":
    case "s":
      keyboardState.down = isDown;
      break;
    case "arrowleft":
    case "a":
      keyboardState.left = isDown;
      break;
    case "arrowright":
    case "d":
      keyboardState.right = isDown;
      break;
    case " ":
    case "enter":
      if (isDown) {
        fireOrnament();
      }
      break;
    default:
      break;
  }
}

function loadImages() {
  overlayTitle.textContent = "Loading...";
  overlayMessage.textContent = "Warming up the sleigh and sharpening the ornaments.";
  const entries = [
    { key: "santa", src: "Santa.png" },
    { key: "tree", src: "tree.png" },
    { key: "ornament", src: "ornament.png" },
  ];

  let loaded = 0;
  entries.forEach((entry) => {
    images[entry.key].src = entry.src;
    images[entry.key].onload = () => {
      loaded += 1;
      if (loaded === entries.length) {
        gameState = "ready";
        setGameState("ready");
        resetGame();
        startButton.disabled = false;
        overlayTitle.textContent = "Ready to Play?";
        overlayMessage.textContent =
          "Move Santa with the joystick. Tap Fire to launch ornaments. Stop the trees before they land.";
      }
    };
  });
}

joystick.addEventListener("pointerdown", (event) => {
  joystickState.active = true;
  joystickState.pointerId = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  handlePointerMove(event);
});

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", resetJoystick);
window.addEventListener("pointercancel", resetJoystick);

fireButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  fireOrnament();
});

startButton.addEventListener("click", startGame);

document.getElementById("musicButton").addEventListener("click", toggleMusic);

overlay.addEventListener("click", () => {
  if (gameState === "ready" || gameState === "over") {
    startGame();
  }
});

window.addEventListener("keydown", (event) => handleKeyboard(event, true));
window.addEventListener("keyup", (event) => handleKeyboard(event, false));

window.addEventListener("resize", resizeCanvas);

loadImages();
resizeCanvas();
requestAnimationFrame(loop);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
