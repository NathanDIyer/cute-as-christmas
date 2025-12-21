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
  stocking: new Image(),
  coal: new Image(),
  reindeer: new Image(),
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
  stocking: 0.12,
  coal: 0.14,
  reindeer: 0.18,
};

let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore"), 10) || 0;
let gameState = "loading";
let level = 1;
let levelMessageTimer = 0;
let rapidFireTimer = 0;
let coalSpawnTimer = 0;
let lastReindeerLevel = 0;
let combo = 0;

const reindeer = {
  active: false,
  x: 0,
  y: 0,
  size: 0,
  timer: 0,
  fireTimer: 0,
};

const santa = {
  x: 0,
  y: 0,
  size: 0,
};

const ornaments = [];
const trees = [];
const stockings = [];
const coals = [];

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
  stockings.length = 0;
  coals.length = 0;
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  fireCooldown = 0;
  level = 1;
  levelMessageTimer = 0;
  rapidFireTimer = 0;
  coalSpawnTimer = 0;
  lastReindeerLevel = 0;
  combo = 0;
  reindeer.active = false;
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

function spawnStocking() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.stocking;
  const padding = size * 0.7;
  stockings.push({
    x: padding + Math.random() * (width - padding * 2),
    y: -size,
    size,
    scale: SCALE.stocking,
    speed: unit * 0.08,
  });
}

function spawnCoal() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.coal;
  const padding = size * 0.7;
  coals.push({
    x: padding + Math.random() * (width - padding * 2),
    y: -size,
    size,
    scale: SCALE.coal,
    speed: unit * 0.12,
  });
}

function spawnReindeer() {
  if (reindeer.active) return;

  const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  reindeer.active = true;
  reindeer.x = -unit * SCALE.reindeer;
  reindeer.y = height * 0.5;
  reindeer.size = unit * SCALE.reindeer;
  reindeer.timer = 4; // 4 seconds of help
  reindeer.fireTimer = 0;
}

function updateReindeer(dt) {
  if (!reindeer.active) return;

  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);

  // Move across screen
  reindeer.x += unit * 0.25 * dt;

  // Auto-fire ornaments
  reindeer.fireTimer -= dt;
  if (reindeer.fireTimer <= 0) {
    const size = unit * SCALE.ornament;
    ornaments.push({
      x: reindeer.x,
      y: reindeer.y + reindeer.size * 0.3,
      size,
      scale: SCALE.ornament,
      speed: unit * 0.9,
    });
    reindeer.fireTimer = 0.25; // Fire rate
  }

  // Deactivate when timer expires or off screen
  reindeer.timer -= dt;
  if (reindeer.timer <= 0 || reindeer.x > width + reindeer.size) {
    reindeer.active = false;
  }
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
  // Rapid fire: 3x faster when power-up active
  fireCooldown = rapidFireTimer > 0 ? 0.12 : 0.35;
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
      combo = 0; // Reset combo on miss
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

function updateStockings(dt) {
  const height = canvas.height / (window.devicePixelRatio || 1);
  stockings.forEach((stocking) => {
    stocking.y += stocking.speed * dt;
  });

  // Remove off-screen stockings
  for (let i = stockings.length - 1; i >= 0; i -= 1) {
    if (stockings[i].y - stockings[i].size > height) {
      stockings.splice(i, 1);
    }
  }
}

function updateCoals(dt) {
  const height = canvas.height / (window.devicePixelRatio || 1);
  coals.forEach((coal) => {
    coal.y += coal.speed * dt;
  });

  // Remove off-screen coals
  for (let i = coals.length - 1; i >= 0; i -= 1) {
    if (coals[i].y - coals[i].size > height) {
      coals.splice(i, 1);
    }
  }
}

function checkSantaCollisions() {
  const santaRadius = santa.size * 0.35;

  // Check stocking pickups
  for (let i = stockings.length - 1; i >= 0; i -= 1) {
    const stocking = stockings[i];
    const dx = santa.x - stocking.x;
    const dy = santa.y - stocking.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + stocking.size * 0.4) {
      stockings.splice(i, 1);
      rapidFireTimer = 5; // 5 seconds of rapid fire
    }
  }

  // Check coal collisions
  for (let i = coals.length - 1; i >= 0; i -= 1) {
    const coal = coals[i];
    const dx = santa.x - coal.x;
    const dy = santa.y - coal.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + coal.size * 0.4) {
      coals.splice(i, 1);
      score = Math.max(0, score - 5);
      scoreEl.textContent = score;
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
        combo += 1;
        // Award points based on combo: 1 point normally, 2 at 5x, 3 at 10x
        const points = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
        score += points;
        scoreEl.textContent = score;

        // Check for level-up (every 10 trees)
        const newLevel = Math.floor(score / 10) + 1;
        if (newLevel > level) {
          level = newLevel;
          levelMessageTimer = 1.5;

          // Spawn reindeer at milestone levels (3, 6, 9...)
          if (level >= 3 && level % 3 === 0 && level > lastReindeerLevel) {
            lastReindeerLevel = level;
            spawnReindeer();
          }
        }
        break;
      }
    }
  }
}

function draw() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  ctx.clearRect(0, 0, width, height);

  const treeAspect = images.tree.naturalHeight / images.tree.naturalWidth || 1;
  trees.forEach((tree) => {
    const treeW = tree.size;
    const treeH = tree.size * treeAspect;
    ctx.drawImage(
      images.tree,
      tree.x - treeW * 0.5,
      tree.y - treeH * 0.5,
      treeW,
      treeH
    );
  });

  // Draw stockings
  const stockingAspect = images.stocking.naturalHeight / images.stocking.naturalWidth || 1;
  stockings.forEach((stocking) => {
    const stockW = stocking.size;
    const stockH = stocking.size * stockingAspect;
    ctx.drawImage(
      images.stocking,
      stocking.x - stockW * 0.5,
      stocking.y - stockH * 0.5,
      stockW,
      stockH
    );
  });

  // Draw coals
  const coalAspect = images.coal.naturalHeight / images.coal.naturalWidth || 1;
  coals.forEach((coal) => {
    const coalW = coal.size;
    const coalH = coal.size * coalAspect;
    ctx.drawImage(
      images.coal,
      coal.x - coalW * 0.5,
      coal.y - coalH * 0.5,
      coalW,
      coalH
    );
  });

  const ornamentAspect = images.ornament.naturalHeight / images.ornament.naturalWidth || 1;
  ornaments.forEach((ornament) => {
    const ornW = ornament.size;
    const ornH = ornament.size * ornamentAspect;
    ctx.drawImage(
      images.ornament,
      ornament.x - ornW * 0.5,
      ornament.y - ornH * 0.5,
      ornW,
      ornH
    );
  });

  const santaAspect = images.santa.naturalHeight / images.santa.naturalWidth || 1;
  const santaW = santa.size;
  const santaH = santa.size * santaAspect;
  ctx.drawImage(
    images.santa,
    santa.x - santaW * 0.5,
    santa.y - santaH * 0.5,
    santaW,
    santaH
  );

  // Draw reindeer helper
  if (reindeer.active) {
    const reindeerAspect = images.reindeer.naturalHeight / images.reindeer.naturalWidth || 1;
    const reindeerW = reindeer.size;
    const reindeerH = reindeer.size * reindeerAspect;
    ctx.drawImage(
      images.reindeer,
      reindeer.x - reindeerW * 0.5,
      reindeer.y - reindeerH * 0.5,
      reindeerW,
      reindeerH
    );
  }

  // Draw level-up message
  if (levelMessageTimer > 0) {
    const alpha = Math.min(1, levelMessageTimer / 0.5);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffd700";
    ctx.strokeStyle = "#8b0000";
    ctx.lineWidth = 4;
    ctx.font = `bold ${Math.min(width, height) * 0.12}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = `Level ${level}!`;
    ctx.strokeText(text, width / 2, height * 0.35);
    ctx.fillText(text, width / 2, height * 0.35);
    ctx.restore();
  }

  // Draw rapid fire indicator
  if (rapidFireTimer > 0) {
    ctx.save();
    ctx.fillStyle = "#ff4444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.font = `bold ${Math.min(width, height) * 0.04}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const indicatorText = `RAPID FIRE ${Math.ceil(rapidFireTimer)}s`;
    ctx.strokeText(indicatorText, 10, 10);
    ctx.fillText(indicatorText, 10, 10);
    ctx.restore();
  }

  // Draw combo indicator
  if (combo >= 2) {
    ctx.save();
    const multiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
    ctx.fillStyle = multiplier >= 3 ? "#ffd700" : multiplier >= 2 ? "#ff8800" : "#44ff44";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.font = `bold ${Math.min(width, height) * 0.05}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    const comboText = `${combo}x COMBO`;
    const pointsText = multiplier > 1 ? ` (${multiplier}pts)` : "";
    ctx.strokeText(comboText + pointsText, width - 10, height - 10);
    ctx.fillText(comboText + pointsText, width - 10, height - 10);
    ctx.restore();
  }
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
    levelMessageTimer = Math.max(0, levelMessageTimer - delta);
    rapidFireTimer = Math.max(0, rapidFireTimer - delta);
    spawnTimer -= delta;
    coalSpawnTimer -= delta;

    const spawnInterval = Math.max(0.45, 1.5 - elapsed * 0.03);
    if (spawnTimer <= 0) {
      spawnTree();
      // 5% chance to spawn a stocking when a tree spawns
      if (Math.random() < 0.05) {
        spawnStocking();
      }
      spawnTimer = spawnInterval;
    }

    // Coal spawns on separate timer (~3% chance per cycle)
    if (coalSpawnTimer <= 0) {
      if (Math.random() < 0.03) {
        spawnCoal();
      }
      coalSpawnTimer = 1.0; // Check every second
    }

    updateSanta(delta);
    updateOrnaments(delta);
    updateTrees(delta);
    updateStockings(delta);
    updateCoals(delta);
    updateReindeer(delta);
    checkCollisions();
    checkSantaCollisions();
  }

  draw();
  requestAnimationFrame(loop);
}

function endGame() {
  if (gameState !== "playing") {
    return;
  }
  setGameState("over");

  const isNewBest = score > highScore;
  if (isNewBest) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }

  overlayTitle.textContent = isNewBest ? "New Best!" : "Game Over";
  const bestText = highScore > 0 ? ` Best: ${highScore}.` : "";
  overlayMessage.textContent = `You cleared ${score} tree${score === 1 ? "" : "s"}.${bestText} Tap to try again.`;
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
    { key: "stocking", src: "stocking.png" },
    { key: "coal", src: "coal.png" },
    { key: "reindeer", src: "reindeer.png" },
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
        const bestText = highScore > 0 ? `\n\nBest: ${highScore} trees` : "";
        overlayMessage.textContent =
          `Move Santa with the joystick. Tap Fire to launch ornaments. Stop the trees before they land.${bestText}`;
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

// Prevent iOS gesture zoom and long-press callouts.
["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
});
window.addEventListener("contextmenu", (event) => event.preventDefault());

loadImages();
resizeCanvas();
requestAnimationFrame(loop);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}
