const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const VERSION = "v1.0";

const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");
const fireButton = document.getElementById("fireButton");
const joystick = document.getElementById("joystick");
const joystickStick = document.getElementById("joystickStick");
const characterSelect = document.getElementById("characterSelect");
const characterGrid = document.getElementById("characterGrid");

startButton.disabled = true;

const images = {
  santa: new Image(),
  msClaus: new Image(),
  frosty: new Image(),
  kasie: new Image(),
  tree: new Image(),
  ornament: new Image(),
  stocking: new Image(),
  coal: new Image(),
  reindeer: new Image(),
  snowflake: new Image(),
  cocoa: new Image(),
  background1: new Image(),
  background2: new Image(),
  background3: new Image(),
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
  msClaus: 0.24,
  frosty: 0.26,
  kasie: 0.22,
  tree: 0.22,
  ornament: 0.1,
  stocking: 0.12,
  coal: 0.18,
  reindeer: 0.18,
  snowflake: 0.14,
  cocoa: 0.12,
};

const CHARACTERS = {
  santa: {
    name: "Santa",
    cost: 0,
    moveSpeed: 1,
    fireRate: 1,
    special: "Classic hero",
  },
  msClaus: {
    name: "Ms. Claus",
    cost: 1000,
    moveSpeed: 1.3,
    fireRate: 1.5,
    special: "Faster movement & shooting",
  },
  frosty: {
    name: "Frosty",
    cost: 2000,
    moveSpeed: 1,
    fireRate: 1,
    special: "Shoots diagonal ornaments",
  },
  kasie: {
    name: "Kasie",
    cost: 10000,
    moveSpeed: 1.6,
    fireRate: 1,
    special: "Joystick firing, fastest",
  },
};

let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore"), 10) || 0;
let totalPoints = parseInt(localStorage.getItem("totalPoints"), 10) || 0;
let unlockedCharacters = JSON.parse(localStorage.getItem("unlockedCharacters")) || { santa: true };
let selectedCharacter = localStorage.getItem("selectedCharacter") || "santa";
let gameState = "loading";
let level = 1;
let levelMessageTimer = 0;
let rapidFireTimer = 0;
let slowMoTimer = 0;
let speedBoostTimer = 0;
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
const snowflakes = [];
const cocoas = [];

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
  santa.size = unit * SCALE[selectedCharacter];
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
  snowflakes.length = 0;
  cocoas.length = 0;
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  fireCooldown = 0;
  level = 1;
  levelMessageTimer = 0;
  rapidFireTimer = 0;
  slowMoTimer = 0;
  speedBoostTimer = 0;
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
    speed: unit * 0.18, // Faster coal
  });
}

function spawnSnowflake() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.snowflake;
  const padding = size * 0.7;
  snowflakes.push({
    x: padding + Math.random() * (width - padding * 2),
    y: -size,
    size,
    scale: SCALE.snowflake,
    speed: unit * 0.08,
  });
}

function spawnCocoa() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.cocoa;
  const padding = size * 0.7;
  cocoas.push({
    x: padding + Math.random() * (width - padding * 2),
    y: -size,
    size,
    scale: SCALE.cocoa,
    speed: unit * 0.08,
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
      fromSanta: false, // Mark as reindeer-fired
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
  
  if (selectedCharacter === "frosty") {
    // Frosty shoots two diagonal ornaments
    ornaments.push({
      x: santa.x,
      y: santa.y - santa.size * 0.55,
      size,
      scale: SCALE.ornament,
      speed: unit * 0.9,
      diagonal: -0.3, // Left diagonal
      fromSanta: true,
    });
    ornaments.push({
      x: santa.x,
      y: santa.y - santa.size * 0.55,
      size,
      scale: SCALE.ornament,
      speed: unit * 0.9,
      diagonal: 0.3, // Right diagonal
      fromSanta: true,
    });
  } else if (selectedCharacter === "kasie") {
    // Kasie has joystick firing - handled separately
    return;
  } else {
    // Santa and Ms. Claus shoot straight
    ornaments.push({
      x: santa.x,
      y: santa.y - santa.size * 0.55,
      size,
      scale: SCALE.ornament,
      speed: unit * 0.9,
      fromSanta: true,
    });
  }
  
  // Fire rate based on character
  const baseFireRate = rapidFireTimer > 0 ? 0.12 : 0.35;
  fireCooldown = baseFireRate / CHARACTERS[selectedCharacter].fireRate;
}

function updateSanta(dt) {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const unit = Math.min(width, height);
  // Character speed with cocoa boost
  const characterSpeed = CHARACTERS[selectedCharacter].moveSpeed;
  const moveSpeed = unit * 0.6 * characterSpeed * (speedBoostTimer > 0 ? 1.5 : 1);

  const inputX = joystickState.vector.x + (keyboardState.right ? 1 : 0) - (keyboardState.left ? 1 : 0);
  const inputY = joystickState.vector.y + (keyboardState.down ? 1 : 0) - (keyboardState.up ? 1 : 0);

  santa.x += inputX * moveSpeed * dt;
  santa.y += inputY * moveSpeed * dt;

  santa.x = Math.min(Math.max(santa.x, santa.size * 0.5), width - santa.size * 0.5);
  santa.y = Math.min(Math.max(santa.y, santa.size * 0.5), height - santa.size * 0.5);
  
  // Kasie auto-fires with joystick direction
  if (selectedCharacter === "kasie" && (inputX !== 0 || inputY !== 0) && fireCooldown <= 0) {
    const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
    const size = unit * SCALE.ornament;
    const speed = unit * 0.9;
    const magnitude = Math.hypot(inputX, inputY);
    if (magnitude > 0) {
      ornaments.push({
        x: santa.x,
        y: santa.y,
        size,
        scale: SCALE.ornament,
        speedX: (inputX / magnitude) * speed,
        speedY: (inputY / magnitude) * speed,
        speed: speed,
        fromSanta: true,
      });
      fireCooldown = rapidFireTimer > 0 ? 0.08 : 0.25;
    }
  }
}

function updateOrnaments(dt) {
  ornaments.forEach((ornament) => {
    if (ornament.speedX !== undefined && ornament.speedY !== undefined) {
      // Kasie's directional shots
      ornament.x += ornament.speedX * dt;
      ornament.y += ornament.speedY * dt;
    } else if (ornament.diagonal !== undefined) {
      // Frosty's diagonal shots
      ornament.x += ornament.diagonal * ornament.speed * dt;
      ornament.y -= ornament.speed * dt;
    } else {
      // Normal straight shots
      ornament.y -= ornament.speed * dt;
    }
  });

  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  for (let i = ornaments.length - 1; i >= 0; i -= 1) {
    const orn = ornaments[i];
    if (orn.y + orn.size < 0 || orn.y - orn.size > height || 
        orn.x + orn.size < 0 || orn.x - orn.size > width) {
      const wasSantaFired = ornaments[i].fromSanta !== false;
      ornaments.splice(i, 1);
      if (wasSantaFired) {
        combo = 0; // Only reset combo on player's missed shots
      }
    }
  }
}

function updateTrees(dt) {
  const height = canvas.height / (window.devicePixelRatio || 1);
  const difficulty = 1 + elapsed / 25;
  // Slow motion: trees move at 40% speed when snowflake is active
  const slowFactor = slowMoTimer > 0 ? 0.4 : 1;
  trees.forEach((tree) => {
    tree.y += tree.speed * difficulty * slowFactor * dt;
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

function updateSnowflakes(dt) {
  const height = canvas.height / (window.devicePixelRatio || 1);
  snowflakes.forEach((snowflake) => {
    snowflake.y += snowflake.speed * dt;
  });

  // Remove off-screen snowflakes
  for (let i = snowflakes.length - 1; i >= 0; i -= 1) {
    if (snowflakes[i].y - snowflakes[i].size > height) {
      snowflakes.splice(i, 1);
    }
  }
}

function updateCocoas(dt) {
  const height = canvas.height / (window.devicePixelRatio || 1);
  cocoas.forEach((cocoa) => {
    cocoa.y += cocoa.speed * dt;
  });

  // Remove off-screen cocoas
  for (let i = cocoas.length - 1; i >= 0; i -= 1) {
    if (cocoas[i].y - cocoas[i].size > height) {
      cocoas.splice(i, 1);
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

  // Check snowflake pickups
  for (let i = snowflakes.length - 1; i >= 0; i -= 1) {
    const snowflake = snowflakes[i];
    const dx = santa.x - snowflake.x;
    const dy = santa.y - snowflake.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + snowflake.size * 0.4) {
      snowflakes.splice(i, 1);
      slowMoTimer = 5; // 5 seconds of slow motion
    }
  }

  // Check cocoa pickups
  for (let i = cocoas.length - 1; i >= 0; i -= 1) {
    const cocoa = cocoas[i];
    const dx = santa.x - cocoa.x;
    const dy = santa.y - cocoa.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + cocoa.size * 0.4) {
      cocoas.splice(i, 1);
      speedBoostTimer = 5; // 5 seconds of speed boost
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

  // Check tree collisions with Santa's body
  for (let i = trees.length - 1; i >= 0; i -= 1) {
    const tree = trees[i];
    const dx = santa.x - tree.x;
    const dy = santa.y - tree.y;
    const distance = Math.hypot(dx, dy);
    const treeRadius = tree.size * 0.35;
    if (distance < santaRadius + treeRadius) {
      trees.splice(i, 1);
      score = Math.max(0, score - 1); // Costs 1 point but saves from defeat
      scoreEl.textContent = score;
      combo = 0; // Reset combo when Santa hits a tree
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
        totalPoints += points;
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

  // Draw background based on level
  const bgLevel = Math.floor((level - 1) / 5) % 3;
  let bgImage = images.background1;
  if (bgLevel === 1) bgImage = images.background2;
  else if (bgLevel === 2) bgImage = images.background3;
  
  if (bgImage.complete) {
    // Scale background to fill canvas
    const bgAspect = bgImage.naturalWidth / bgImage.naturalHeight;
    const canvasAspect = width / height;
    let drawWidth = width;
    let drawHeight = height;
    let drawX = 0;
    let drawY = 0;
    
    if (bgAspect > canvasAspect) {
      // Background is wider, fit height
      drawWidth = height * bgAspect;
      drawX = (width - drawWidth) / 2;
    } else {
      // Background is taller, fit width
      drawHeight = width / bgAspect;
      drawY = (height - drawHeight) / 2;
    }
    
    ctx.drawImage(bgImage, drawX, drawY, drawWidth, drawHeight);
  }

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

  // Draw snowflakes
  const snowflakeAspect = images.snowflake.naturalHeight / images.snowflake.naturalWidth || 1;
  snowflakes.forEach((snowflake) => {
    const snowW = snowflake.size;
    const snowH = snowflake.size * snowflakeAspect;
    ctx.drawImage(
      images.snowflake,
      snowflake.x - snowW * 0.5,
      snowflake.y - snowH * 0.5,
      snowW,
      snowH
    );
  });

  // Draw cocoas
  const cocoaAspect = images.cocoa.naturalHeight / images.cocoa.naturalWidth || 1;
  cocoas.forEach((cocoa) => {
    const cocoaW = cocoa.size;
    const cocoaH = cocoa.size * cocoaAspect;
    ctx.drawImage(
      images.cocoa,
      cocoa.x - cocoaW * 0.5,
      cocoa.y - cocoaH * 0.5,
      cocoaW,
      cocoaH
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

  const characterImage = images[selectedCharacter];
  const characterAspect = characterImage.naturalHeight / characterImage.naturalWidth || 1;
  const characterW = santa.size;
  const characterH = santa.size * characterAspect;
  ctx.drawImage(
    characterImage,
    santa.x - characterW * 0.5,
    santa.y - characterH * 0.5,
    characterW,
    characterH
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

  // Draw powerup indicators
  let powerupY = 10;
  if (rapidFireTimer > 0) {
    ctx.save();
    ctx.fillStyle = "#ff4444";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.font = `bold ${Math.min(width, height) * 0.04}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const indicatorText = `RAPID FIRE ${Math.ceil(rapidFireTimer)}s`;
    ctx.strokeText(indicatorText, 10, powerupY);
    ctx.fillText(indicatorText, 10, powerupY);
    ctx.restore();
    powerupY += 30;
  }
  
  if (slowMoTimer > 0) {
    ctx.save();
    ctx.fillStyle = "#44aaff";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.font = `bold ${Math.min(width, height) * 0.04}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const indicatorText = `SLOW MOTION ${Math.ceil(slowMoTimer)}s`;
    ctx.strokeText(indicatorText, 10, powerupY);
    ctx.fillText(indicatorText, 10, powerupY);
    ctx.restore();
    powerupY += 30;
  }
  
  if (speedBoostTimer > 0) {
    ctx.save();
    ctx.fillStyle = "#8b4513";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.font = `bold ${Math.min(width, height) * 0.04}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const indicatorText = `SPEED BOOST ${Math.ceil(speedBoostTimer)}s`;
    ctx.strokeText(indicatorText, 10, powerupY);
    ctx.fillText(indicatorText, 10, powerupY);
    ctx.restore();
  }

  // Draw combo indicator (top-right, below HUD)
  if (combo >= 2) {
    ctx.save();
    const multiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
    ctx.fillStyle = multiplier >= 3 ? "#ffd700" : multiplier >= 2 ? "#ff8800" : "#44ff44";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    ctx.font = `bold ${Math.min(width, height) * 0.06}px sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    // Christmas-themed combo messages
    let comboText = "";
    if (combo >= 25) {
      comboText = "SANTA'S MIRACLE!";
    } else if (combo >= 20) {
      comboText = "HO HO HO!";
    } else if (combo >= 15) {
      comboText = "JINGLE BELLS!";
    } else if (combo >= 10) {
      comboText = "MERRY CHRISTMAS!";
    } else if (combo >= 5) {
      comboText = "NICE LIST!";
    } else {
      comboText = `${combo}x COMBO`;
    }
    const pointsText = multiplier > 1 ? ` (${multiplier}pts)` : "";
    ctx.strokeText(comboText + pointsText, width - 10, 80);
    ctx.fillText(comboText + pointsText, width - 10, 80);
    ctx.restore();
  }

  // Draw version (top-left, below HUD, always visible for testing)
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 2;
  ctx.font = `bold ${Math.min(width, height) * 0.025}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.strokeText(VERSION, 10, 70);
  ctx.fillText(VERSION, 10, 70);
  ctx.restore();
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
    slowMoTimer = Math.max(0, slowMoTimer - delta);
    speedBoostTimer = Math.max(0, speedBoostTimer - delta);
    spawnTimer -= delta;
    coalSpawnTimer -= delta;

    const spawnInterval = Math.max(0.45, 1.5 - elapsed * 0.03);
    if (spawnTimer <= 0) {
      spawnTree();
      // Balanced powerup spawning: total 5% chance, split among three powerups
      const powerupRoll = Math.random();
      if (powerupRoll < 0.017) {
        spawnStocking();
      } else if (powerupRoll < 0.033) {
        spawnSnowflake();
      } else if (powerupRoll < 0.05) {
        spawnCocoa();
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
    updateSnowflakes(delta);
    updateCocoas(delta);
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
  
  // Save total points
  localStorage.setItem("totalPoints", totalPoints);

  overlayTitle.textContent = isNewBest ? "New Best!" : "Game Over";
  const bestText = highScore > 0 ? ` Best: ${highScore}.` : "";
  const totalText = `\n\nTotal Points: ${totalPoints}`;
  overlayMessage.textContent = `You cleared ${score} tree${score === 1 ? "" : "s"}.${bestText}${totalText}\n\nTap to return to menu.`;
  startButton.textContent = "Character Select";
}

function showCharacterSelect() {
  overlayTitle.textContent = "Select Character";
  overlayMessage.style.display = "none";
  characterSelect.style.display = "block";
  startButton.textContent = "Play";
  
  // Add total points display
  let totalPointsDiv = characterSelect.querySelector(".total-points");
  if (!totalPointsDiv) {
    totalPointsDiv = document.createElement("div");
    totalPointsDiv.className = "total-points";
    characterSelect.insertBefore(totalPointsDiv, characterGrid);
  }
  totalPointsDiv.textContent = `Total Points: ${totalPoints}`;
  
  renderCharacters();
}

function renderCharacters() {
  characterGrid.innerHTML = "";
  
  Object.entries(CHARACTERS).forEach(([key, char]) => {
    const card = document.createElement("div");
    card.className = "character-card";
    
    const isUnlocked = unlockedCharacters[key] || totalPoints >= char.cost;
    const isSelected = key === selectedCharacter;
    
    if (!isUnlocked && char.cost > 0) {
      card.classList.add("locked");
    }
    if (isSelected) {
      card.classList.add("selected");
    }
    
    const img = document.createElement("img");
    img.src = key === "frosty" ? "snowman.png" : `${key === "msClaus" ? "Ms_Clause" : key}.png`;
    img.alt = char.name;
    
    const name = document.createElement("div");
    name.className = "character-name";
    name.textContent = char.name;
    
    const cost = document.createElement("div");
    cost.className = "character-cost";
    if (char.cost === 0) {
      cost.textContent = "FREE";
    } else if (isUnlocked) {
      cost.textContent = "UNLOCKED";
    } else {
      cost.textContent = `${char.cost} points`;
    }
    
    const special = document.createElement("div");
    special.className = "character-special";
    special.textContent = char.special;
    
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(cost);
    card.appendChild(special);
    
    card.addEventListener("click", () => {
      if (isUnlocked || totalPoints >= char.cost) {
        if (!isUnlocked && char.cost > 0) {
          // Purchase character
          totalPoints -= char.cost;
          unlockedCharacters[key] = true;
          localStorage.setItem("totalPoints", totalPoints);
          localStorage.setItem("unlockedCharacters", JSON.stringify(unlockedCharacters));
        }
        selectedCharacter = key;
        localStorage.setItem("selectedCharacter", selectedCharacter);
        renderCharacters();
      }
    });
    
    characterGrid.appendChild(card);
  });
}

function startGame() {
  if (characterSelect.style.display !== "none") {
    characterSelect.style.display = "none";
    overlayMessage.style.display = "block";
  }
  
  resetGame();
  updateScale(); // Update scale for selected character
  overlayTitle.textContent = "Ready to Play?";
  overlayMessage.textContent =
    `Move ${CHARACTERS[selectedCharacter].name} with the joystick. ${selectedCharacter === 'kasie' ? 'Aim joystick to fire!' : 'Tap Fire to launch ornaments.'} Stop the trees before they land.`;
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
    { key: "msClaus", src: "Ms_Clause.png" },
    { key: "frosty", src: "snowman.png" },
    { key: "kasie", src: "kasie.png" },
    { key: "tree", src: "tree.png" },
    { key: "ornament", src: "ornament.png" },
    { key: "stocking", src: "stocking.png" },
    { key: "coal", src: "coal.png" },
    { key: "reindeer", src: "reindeer.png" },
    { key: "snowflake", src: "snowflake.png" },
    { key: "cocoa", src: "coco.png" },
    { key: "background1", src: "Background.png" },
    { key: "background2", src: "background_2.png" },
    { key: "background3", src: "background_3.png" },
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
        overlayTitle.textContent = "Welcome!";
        const bestText = highScore > 0 ? `\n\nBest: ${highScore} trees` : "";
        overlayMessage.textContent =
          `Save Christmas by stopping the falling trees!\n\n` +
          `Collect points to unlock new characters with unique abilities.\n\n` +
          `Total Points: ${totalPoints}${bestText}`;
        startButton.textContent = "Select Character";
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

startButton.addEventListener("click", () => {
  if (gameState === "ready" || gameState === "over") {
    showCharacterSelect();
  } else if (characterSelect.style.display !== "none") {
    startGame();
  }
});

document.getElementById("musicButton").addEventListener("click", toggleMusic);

overlay.addEventListener("click", (event) => {
  // Only handle clicks outside the overlay card
  if (event.target === overlay) {
    if (gameState === "ready" || gameState === "over") {
      if (characterSelect.style.display === "none") {
        showCharacterSelect();
      }
    }
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
