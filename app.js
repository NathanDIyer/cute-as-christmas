const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const VERSION = "v2.0";

const scoreEl = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");
const fireButton = document.getElementById("fireButton");
const joystick = document.getElementById("joystick");
const joystickStick = document.getElementById("joystickStick");
const fireJoystick = document.getElementById("fireJoystick");
const fireJoystickStick = document.getElementById("fireJoystickStick");
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
  blueOrnament: new Image(),
  goldOrnament: new Image(),
  present: new Image(),
  bluePresent: new Image(),
  bossTree: new Image(),
  star: new Image(),
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
  blueOrnament: 0.1,
  goldOrnament: 0.1,
  present: 0.12,
  bluePresent: 0.12,
  bossTree: 0.35,
  star: 0.08,
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
let reindeerUnlockedSaved = localStorage.getItem("reindeerUnlocked") === "true";
let gameState = "loading";
let level = 1;
let levelMessageTimer = 0;
let rapidFireTimer = 0;
let slowMoTimer = 0;
let speedBoostTimer = 0;
let coalSpawnTimer = 0;
let lastReindeerLevel = 0;
let combo = 0;

// Ammunition system
let ammoInventory = {
  regular: { count: -1, damage: 1, image: "ornament" },
  blue: { count: 0, damage: 1, image: "blueOrnament", special: "homing" },
  gold: { count: 0, damage: 2, image: "goldOrnament", special: "explode" }
};
let currentAmmoType = "regular";

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
const presents = [];
const explosions = [];
const lightningBolts = [];
const coalProjectiles = [];

let bossTree = null;
let bossActive = false;

// Companion reindeer system
let companionReindeer = [];
let reindeerUnlocked = reindeerUnlockedSaved;
let collectibleStars = [];
let starAvailable = false;
let treesDestroyed = 0; // Track trees destroyed for level progression

// Permanent stat upgrades
let playerUpgrades = {
  fireRate: 0,    // Each stocking adds fire rate
  speed: 0,       // Each cocoa adds movement speed  
  slowMo: 0       // Each snowflake adds slow-mo power (keep this temporary since it affects all trees)
};

const joystickState = {
  pointerId: null,
  active: false,
  center: { x: 0, y: 0 },
  radius: 0,
  vector: { x: 0, y: 0 },
};

const fireJoystickState = {
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
  
  // Update fire joystick bounds if visible
  if (fireJoystick.style.display !== "none") {
    const fireRect = fireJoystick.getBoundingClientRect();
    fireJoystickState.center = {
      x: fireRect.left + fireRect.width / 2,
      y: fireRect.top + fireRect.height / 2,
    };
    fireJoystickState.radius = fireRect.width / 2 - 6;
  }
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
  presents.length = 0;
  explosions.length = 0;
  lightningBolts.length = 0;
  coalProjectiles.length = 0;
  bossTree = null;
  bossActive = false;
  
  // Clear companion reindeer and stars on reset
  companionReindeer = [];
  collectibleStars = [];
  starAvailable = false;
  treesDestroyed = 0;
  
  // Reset permanent upgrades
  playerUpgrades.fireRate = 0;
  playerUpgrades.speed = 0;
  playerUpgrades.slowMo = 0;
  
  score = 0;
  elapsed = 0;
  spawnTimer = 0;
  fireCooldown = 0;
  level = 1;
  levelMessageTimer = 0;
  slowMoTimer = 0;
  coalSpawnTimer = 0;
  lastReindeerLevel = 0;
  combo = 0;
  reindeer.active = false;
  
  // Reset ammo to starting values
  currentAmmoType = "regular";
  ammoInventory.blue.count = 5;  // Start with some blue ammo for testing
  ammoInventory.gold.count = 3;  // Start with some gold ammo for testing
  
  scoreEl.textContent = score;
  updateAmmoUI();
}

function updateDifficulty(dt) {
  elapsed += dt;
}

function spawnTree() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.tree;
  const padding = size * 0.7;
  
  // Tree speed varies slightly but scales with level
  const baseSpeed = 0.14 + Math.random() * 0.08;
  const levelSpeedBonus = Math.min((level - 1) * 0.03, 0.18); // 3% per level, max 18% bonus
  
  trees.push({
    x: padding + Math.random() * (width - padding * 2),
    y: -size,
    size,
    scale: SCALE.tree,
    speed: unit * (baseSpeed + levelSpeedBonus),
    type: "regular",
    health: 1,
    maxHealth: 1,
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

function spawnPresent(x, y, type = "blue") {
  const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  const scale = type === "blue" ? SCALE.bluePresent : SCALE.present;
  const size = unit * scale;
  
  presents.push({
    x: x,
    y: y,
    size,
    scale: scale,
    speed: unit * 0.06, // Slower than power-ups so easier to collect
    type: type,
    image: type === "blue" ? "bluePresent" : "present"
  });
}

function createExplosion(x, y) {
  explosions.push({
    x: x,
    y: y,
    radius: 0,
    maxRadius: 50,
    timer: 0.3, // 0.3 seconds duration
    opacity: 1
  });
}

function createLightning(fromX, fromY, toX, toY) {
  lightningBolts.push({
    fromX: fromX,
    fromY: fromY,
    toX: toX,
    toY: toY,
    timer: 0.4, // Longer visible flash
    opacity: 1,
    segments: [] // Pre-generate jagged segments for consistent look
  });
  // Pre-generate the jagged path so it doesn't flicker randomly
  const bolt = lightningBolts[lightningBolts.length - 1];
  const dx = toX - fromX;
  const dy = toY - fromY;
  const numSegments = 6;
  bolt.segments.push({ x: fromX, y: fromY });
  for (let i = 1; i < numSegments; i++) {
    const progress = i / numSegments;
    const x = fromX + dx * progress;
    const y = fromY + dy * progress;
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 30;
    bolt.segments.push({ x: x + offsetX, y: y + offsetY });
  }
  bolt.segments.push({ x: toX, y: toY });
}

function spawnBoss() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.bossTree;
  const bossHealth = level; // Health equals current level
  
  bossTree = {
    x: width / 2,
    y: -size,
    size: size,
    scale: SCALE.bossTree,
    speed: unit * 0.05, // Slower than regular trees
    type: "boss",
    health: bossHealth,
    maxHealth: bossHealth,
    coalTimer: 0,
    treeSpawnTimer: 0,
    entering: true
  };
  bossActive = true;
}

function updateBoss(dt) {
  if (!bossTree) return;
  
  const height = canvas.height / (window.devicePixelRatio || 1);
  
  // Move boss down slowly
  if (bossTree.entering && bossTree.y < height * 0.15) {
    bossTree.y += bossTree.speed * dt;
  } else {
    bossTree.entering = false;
  }
  
  if (!bossTree.entering) {
    // Fire coal at player
    bossTree.coalTimer -= dt;
    if (bossTree.coalTimer <= 0) {
      fireCoalAtPlayer();
      bossTree.coalTimer = 3; // Fire every 3 seconds
    }
    
    // Spawn trees
    bossTree.treeSpawnTimer -= dt;
    if (bossTree.treeSpawnTimer <= 0) {
      spawnBossMinions();
      bossTree.treeSpawnTimer = 5; // Spawn trees every 5 seconds
    }
  }
  
  // Check if boss reached bottom
  if (bossTree.y - bossTree.size * 0.4 > height) {
    endGame();
  }
}

function fireCoalAtPlayer() {
  if (!bossTree) return;
  
  const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  const size = unit * SCALE.coal;
  
  // Calculate direction to player
  const dx = santa.x - bossTree.x;
  const dy = santa.y - bossTree.y;
  const distance = Math.hypot(dx, dy);
  
  if (distance > 0) {
    const speed = unit * 0.3;
    coalProjectiles.push({
      x: bossTree.x,
      y: bossTree.y + bossTree.size * 0.3,
      size: size,
      scale: SCALE.coal,
      speedX: (dx / distance) * speed,
      speedY: (dy / distance) * speed,
      fromBoss: true
    });
  }
}

function spawnBossMinions() {
  if (!bossTree) return;
  
  const width = canvas.width / (window.devicePixelRatio || 1);
  const unit = Math.min(width, canvas.height / (window.devicePixelRatio || 1));
  const size = unit * SCALE.tree;
  
  // Spawn 5 trees in a row - much slower
  for (let i = 0; i < 5; i++) {
    const spacing = width / 6; // Spread across screen
    const x = spacing + (i * spacing);
    
    trees.push({
      x: x,
      y: bossTree.y + bossTree.size,
      size: size,
      scale: SCALE.tree,
      speed: unit * (0.06 + Math.random() * 0.02), // Much slower: 0.06-0.08 instead of 0.15-0.20
      type: "minion",
      health: 1,
      maxHealth: 1,
    });
  }
}

function updateCoalProjectiles(dt) {
  for (let i = coalProjectiles.length - 1; i >= 0; i--) {
    const coal = coalProjectiles[i];
    coal.x += coal.speedX * dt;
    coal.y += coal.speedY * dt;
    
    // Remove if off screen
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    if (coal.x < -coal.size || coal.x > width + coal.size ||
        coal.y < -coal.size || coal.y > height + coal.size) {
      coalProjectiles.splice(i, 1);
    }
  }
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

  // Check ammo availability
  const ammo = ammoInventory[currentAmmoType];
  if (currentAmmoType !== "regular" && ammo.count <= 0) {
    return; // No special ammo left
  }

  const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
  const ammoScale = SCALE[ammo.image] || SCALE.ornament;
  const size = unit * ammoScale;
  
  if (selectedCharacter === "frosty") {
    // Frosty shoots two diagonal ornaments
    ornaments.push({
      x: santa.x,
      y: santa.y - santa.size * 0.55,
      size,
      scale: ammoScale,
      speed: unit * 0.9,
      diagonal: -0.3, // Left diagonal
      fromSanta: true,
      ammoType: currentAmmoType,
      damage: ammo.damage,
      special: ammo.special,
    });
    ornaments.push({
      x: santa.x,
      y: santa.y - santa.size * 0.55,
      size,
      scale: ammoScale,
      speed: unit * 0.9,
      diagonal: 0.3, // Right diagonal
      fromSanta: true,
      ammoType: currentAmmoType,
      damage: ammo.damage,
      special: ammo.special,
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
      scale: ammoScale,
      speed: unit * 0.9,
      fromSanta: true,
      ammoType: currentAmmoType,
      damage: ammo.damage,
      special: ammo.special,
    });
  }
  
  // Fire rate based on character and permanent upgrades
  const baseFireRate = 0.35;
  const fireRateMultiplier = CHARACTERS[selectedCharacter].fireRate + (playerUpgrades.fireRate * 0.15); // Each stocking = +15% fire rate
  fireCooldown = baseFireRate / fireRateMultiplier;
  
  // Deduct ammo for special types and update UI immediately
  if (currentAmmoType !== "regular") {
    ammoInventory[currentAmmoType].count--;
    updateAmmoUI();
  }
}

function updateSanta(dt) {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const unit = Math.min(width, height);
  // Character speed with permanent cocoa upgrades
  const characterSpeed = CHARACTERS[selectedCharacter].moveSpeed;
  const speedMultiplier = 1 + (playerUpgrades.speed * 0.1); // Each cocoa = +10% movement speed
  const moveSpeed = unit * 0.6 * characterSpeed * speedMultiplier;

  const inputX = joystickState.vector.x + (keyboardState.right ? 1 : 0) - (keyboardState.left ? 1 : 0);
  const inputY = joystickState.vector.y + (keyboardState.down ? 1 : 0) - (keyboardState.up ? 1 : 0);

  santa.x += inputX * moveSpeed * dt;
  santa.y += inputY * moveSpeed * dt;

  santa.x = Math.min(Math.max(santa.x, santa.size * 0.5), width - santa.size * 0.5);
  santa.y = Math.min(Math.max(santa.y, santa.size * 0.5), height - santa.size * 0.5);
  
  // Kasie fires with fire joystick
  if (selectedCharacter === "kasie" && fireJoystickState.active && fireCooldown <= 0) {
    const fireInputX = fireJoystickState.vector.x;
    const fireInputY = fireJoystickState.vector.y;
    const magnitude = Math.hypot(fireInputX, fireInputY);
    
    if (magnitude > 0.3) { // Dead zone
      // Check ammo availability
      const ammo = ammoInventory[currentAmmoType];
      if (currentAmmoType !== "regular" && ammo.count <= 0) {
        return; // No special ammo left
      }
      
      const unit = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
      const ammoScale = SCALE[ammo.image] || SCALE.ornament;
      const size = unit * ammoScale;
      const speed = unit * 0.9;
      
      ornaments.push({
        x: santa.x,
        y: santa.y,
        size,
        scale: ammoScale,
        speedX: (fireInputX / magnitude) * speed,
        speedY: (fireInputY / magnitude) * speed,
        speed: speed,
        fromSanta: true,
        ammoType: currentAmmoType,
        damage: ammo.damage,
        special: ammo.special,
      });
      // Kasie's fire rate with permanent upgrades
      const kasieBaseFireRate = 0.25;
      const kasieFireRateMultiplier = CHARACTERS[selectedCharacter].fireRate + (playerUpgrades.fireRate * 0.15);
      fireCooldown = kasieBaseFireRate / kasieFireRateMultiplier;
      
      // Deduct ammo for special types and update UI immediately
      if (currentAmmoType !== "regular") {
        ammoInventory[currentAmmoType].count--;
        updateAmmoUI();
      }
    }
  }
}

function updateOrnaments(dt) {
  ornaments.forEach((ornament) => {
    // Handle homing ornaments
    if (ornament.special === "homing") {
      // Find the nearest tree
      let nearestTree = null;
      let nearestDistance = Infinity;
      
      trees.forEach((tree) => {
        const dx = tree.x - ornament.x;
        const dy = tree.y - ornament.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestTree = tree;
        }
      });
      
      if (nearestTree && nearestDistance > 0) {
        // Calculate homing direction
        const dx = nearestTree.x - ornament.x;
        const dy = nearestTree.y - ornament.y;
        const distance = Math.hypot(dx, dy);
        
        // Normalize direction
        const dirX = dx / distance;
        const dirY = dy / distance;
        
        // Homing strength (how quickly it turns)
        const homingStrength = 3;
        
        // Current velocity direction
        let currentVelX, currentVelY;
        if (ornament.speedX !== undefined && ornament.speedY !== undefined) {
          currentVelX = ornament.speedX;
          currentVelY = ornament.speedY;
        } else {
          currentVelX = ornament.diagonal || 0;
          currentVelY = -ornament.speed;
        }
        
        // Blend current velocity with target direction
        const blendFactor = homingStrength * dt;
        const newVelX = currentVelX + (dirX * ornament.speed - currentVelX) * blendFactor;
        const newVelY = currentVelY + (dirY * ornament.speed - currentVelY) * blendFactor;
        
        // Normalize to maintain speed
        const velMagnitude = Math.hypot(newVelX, newVelY);
        if (velMagnitude > 0) {
          ornament.speedX = (newVelX / velMagnitude) * ornament.speed;
          ornament.speedY = (newVelY / velMagnitude) * ornament.speed;
        }
        
        // Move the ornament
        ornament.x += ornament.speedX * dt;
        ornament.y += ornament.speedY * dt;
      } else {
        // No target, move normally
        if (ornament.speedX !== undefined && ornament.speedY !== undefined) {
          ornament.x += ornament.speedX * dt;
          ornament.y += ornament.speedY * dt;
        } else {
          ornament.y -= ornament.speed * dt;
        }
      }
    } else if (ornament.speedX !== undefined && ornament.speedY !== undefined) {
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
  // Level-based difficulty scaling (faster progression)
  const difficulty = 1 + (level - 1) * 0.15; // 15% speed increase per level
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

function updatePresents(dt) {
  const height = canvas.height / (window.devicePixelRatio || 1);
  presents.forEach((present) => {
    present.y += present.speed * dt;
  });

  // Remove off-screen presents
  for (let i = presents.length - 1; i >= 0; i -= 1) {
    if (presents[i].y - presents[i].size > height) {
      presents.splice(i, 1);
    }
  }
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    explosion.timer -= dt;
    
    // Grow the explosion radius
    const progress = 1 - (explosion.timer / 0.3);
    explosion.radius = explosion.maxRadius * progress;
    explosion.opacity = 1 - progress;
    
    // Remove finished explosions
    if (explosion.timer <= 0) {
      explosions.splice(i, 1);
    }
  }
}

function updateLightning(dt) {
  for (let i = lightningBolts.length - 1; i >= 0; i--) {
    const lightning = lightningBolts[i];
    lightning.timer -= dt;
    lightning.opacity = lightning.timer / 0.4; // Fade out over 0.4 seconds

    // Remove finished lightning
    if (lightning.timer <= 0) {
      lightningBolts.splice(i, 1);
    }
  }
}

function checkSantaCollisions() {
  const santaRadius = santa.size * 0.35;

  // Check stocking pickups - permanent fire rate boost
  for (let i = stockings.length - 1; i >= 0; i -= 1) {
    const stocking = stockings[i];
    const dx = santa.x - stocking.x;
    const dy = santa.y - stocking.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + stocking.size * 0.4) {
      stockings.splice(i, 1);
      playerUpgrades.fireRate += 1; // Permanent fire rate increase
    }
  }

  // Check snowflake pickups - temporary slow motion (affects all trees)
  for (let i = snowflakes.length - 1; i >= 0; i -= 1) {
    const snowflake = snowflakes[i];
    const dx = santa.x - snowflake.x;
    const dy = santa.y - snowflake.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + snowflake.size * 0.4) {
      snowflakes.splice(i, 1);
      slowMoTimer = 5; // Keep this temporary since it affects all enemies
      playerUpgrades.slowMo += 1; // Track how many collected for power indicator
    }
  }

  // Check cocoa pickups - permanent speed boost
  for (let i = cocoas.length - 1; i >= 0; i -= 1) {
    const cocoa = cocoas[i];
    const dx = santa.x - cocoa.x;
    const dy = santa.y - cocoa.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + cocoa.size * 0.4) {
      cocoas.splice(i, 1);
      playerUpgrades.speed += 1; // Permanent movement speed increase
    }
  }

  // Check present pickups
  for (let i = presents.length - 1; i >= 0; i -= 1) {
    const present = presents[i];
    const dx = santa.x - present.x;
    const dy = santa.y - present.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + present.size * 0.4) {
      presents.splice(i, 1);
      
      // Award ammo based on present type
      if (present.type === "blue") {
        ammoInventory.blue.count += Math.floor(Math.random() * 3) + 3; // 3-5 blue ornaments
      } else if (present.type === "gold") {
        ammoInventory.gold.count += Math.floor(Math.random() * 2) + 2; // 2-3 gold ornaments
      }
      
      // Update UI
      updateAmmoUI();
    }
  }

  // Check boss coal projectile collisions
  for (let i = coalProjectiles.length - 1; i >= 0; i -= 1) {
    const coal = coalProjectiles[i];
    const dx = santa.x - coal.x;
    const dy = santa.y - coal.y;
    const distance = Math.hypot(dx, dy);
    if (distance < santaRadius + coal.size * 0.4) {
      coalProjectiles.splice(i, 1);
      score = Math.max(0, score - 10); // Bigger penalty for boss coal
      scoreEl.textContent = score;
      combo = 0; // Reset combo on hit
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
      
      // Remove a companion reindeer if one exists
      if (companionReindeer.length > 0) {
        companionReindeer.pop(); // Remove the last companion
      }
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

function checkBossCollisions() {
  if (!bossTree) return;
  
  const bossRadius = bossTree.size * 0.4;
  
  for (let j = ornaments.length - 1; j >= 0; j -= 1) {
    const ornament = ornaments[j];
    const dx = bossTree.x - ornament.x;
    const dy = bossTree.y - ornament.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance < bossRadius + ornament.size * 0.4) {
      ornaments.splice(j, 1);
      
      // Handle special ammo effects on boss
      if (ornament.special === "explode") {
        createExplosion(bossTree.x, bossTree.y);
        // Boss takes double damage from explosions
        bossTree.health -= (ornament.damage || 1) * 2;
      } else {
        bossTree.health -= (ornament.damage || 1);
      }
      
      // Check if boss defeated
      if (bossTree.health <= 0) {
        // Boss defeated! Award big points and presents
        score += 50; // Big bonus
        totalPoints += 50;
        scoreEl.textContent = score;
        
        // Drop lots of presents
        for (let k = 0; k < 3; k++) {
          spawnPresent(bossTree.x + (Math.random() - 0.5) * 100, bossTree.y, "blue");
        }
        for (let k = 0; k < 2; k++) {
          spawnPresent(bossTree.x + (Math.random() - 0.5) * 100, bossTree.y, "gold");
        }
        
        // Clear boss
        bossTree = null;
        bossActive = false;
        combo += 5; // Bonus combo for boss kill
        
        // Unlock companion reindeer system and spawn collectible star
        if (!reindeerUnlocked) {
          reindeerUnlocked = true;
          localStorage.setItem("reindeerUnlocked", "true");
        }
        
        // Only spawn star if we have less than 2 companions
        if (companionReindeer.length < 2) {
          spawnCollectibleStar();
        }
      }
      
      break;
    }
  }
}

// Star Collection System
function spawnCollectibleStar() {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const unit = Math.min(width, height) / 30;
  
  // Spawn star at top of screen, random X position
  const star = {
    x: width * 0.2 + Math.random() * width * 0.6, // Keep within bounds
    y: height * 0.15, // Near top of screen
    targetX: width * 0.2 + Math.random() * width * 0.6,
    targetY: height * 0.1 + Math.random() * height * 0.1,
    size: unit * SCALE.star,
    scale: SCALE.star,
    moveTimer: 0,
    moveInterval: 2000, // Change direction every 2 seconds
    vx: 0,
    vy: 0,
    collected: false
  };
  
  collectibleStars.push(star);
  starAvailable = true;
}

function updateCollectibleStars(dt) {
  if (collectibleStars.length === 0) return;
  
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  
  for (let i = collectibleStars.length - 1; i >= 0; i--) {
    const star = collectibleStars[i];
    
    // Update movement timer
    star.moveTimer += dt * 1000;
    
    // Pick new target every moveInterval
    if (star.moveTimer >= star.moveInterval) {
      star.targetX = width * 0.2 + Math.random() * width * 0.6;
      star.targetY = height * 0.1 + Math.random() * height * 0.1;
      star.moveTimer = 0;
    }
    
    // Move toward target (flitting motion)
    const moveSpeed = 3;
    star.vx = (star.targetX - star.x) * moveSpeed * dt;
    star.vy = (star.targetY - star.y) * moveSpeed * dt;
    
    star.x += star.vx;
    star.y += star.vy;
    
    // Check collision with player
    const distance = Math.hypot(santa.x - star.x, santa.y - star.y);
    if (distance < star.size * 0.5 + santa.size * 0.3) {
      // Star collected! Spawn companion
      spawnCompanionReindeer();
      collectibleStars.splice(i, 1);
      
      if (collectibleStars.length === 0) {
        starAvailable = false;
      }
      
      // Award points
      score += 25;
      totalPoints += 25;
      scoreEl.textContent = score;
    }
  }
}

function drawCollectibleStars() {
  for (const star of collectibleStars) {
    ctx.save();
    ctx.translate(star.x, star.y);
    
    // Add sparkle effect
    const sparkleOffset = Math.sin(Date.now() * 0.01) * 2;
    ctx.rotate(Date.now() * 0.005); // Slow rotation
    ctx.translate(sparkleOffset, sparkleOffset * 0.5);
    
    // Draw star
    if (images.star.complete && images.star.naturalWidth) {
      const size = star.size;
      ctx.drawImage(images.star, -size / 2, -size / 2, size, size);
    } else {
      // Fallback star shape
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.moveTo(0, -star.size/2);
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((i * 2 + 1) * Math.PI / 5) * star.size/4, 
                   Math.sin((i * 2 + 1) * Math.PI / 5) * star.size/4);
        ctx.lineTo(Math.cos((i * 2 + 2) * Math.PI / 5) * star.size/2, 
                   Math.sin((i * 2 + 2) * Math.PI / 5) * star.size/2);
      }
      ctx.closePath();
      ctx.fill();
      
      // Add glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#FFD700";
      ctx.fill();
    }
    
    ctx.restore();
  }
}

// Companion Reindeer System
function spawnCompanionReindeer() {
  // Limit to 2 companions maximum
  if (companionReindeer.length >= 2) return;
  
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);
  const unit = Math.min(width, height) / 30;
  
  // Create a companion reindeer that orbits the player
  const baseAngle = companionReindeer.length * Math.PI; // Spread them out
  const reindeer = {
    x: santa.x + 80,
    y: santa.y - 40,
    targetX: santa.x + 80,
    targetY: santa.y - 40,
    size: unit * SCALE.reindeer,
    scale: SCALE.reindeer,
    angle: baseAngle,
    orbitRadius: 80,
    orbitSpeed: 1.5,
    fireTimer: 0,
    fireRate: 3000 // Fire every 3 seconds
  };
  
  companionReindeer.push(reindeer);
}

function updateCompanionReindeer(dt) {
  if (!reindeerUnlocked || companionReindeer.length === 0) return;
  
  for (let i = 0; i < companionReindeer.length; i++) {
    const reindeer = companionReindeer[i];
    
    // Update orbit position around player
    reindeer.angle += reindeer.orbitSpeed * dt;
    reindeer.targetX = santa.x + Math.cos(reindeer.angle) * reindeer.orbitRadius;
    reindeer.targetY = santa.y + Math.sin(reindeer.angle) * reindeer.orbitRadius - 20;
    
    // Smooth movement to target position
    const moveSpeed = 8;
    reindeer.x += (reindeer.targetX - reindeer.x) * moveSpeed * dt;
    reindeer.y += (reindeer.targetY - reindeer.y) * moveSpeed * dt;
    
    // Auto-fire at nearest tree
    reindeer.fireTimer += dt * 1000;
    if (reindeer.fireTimer >= reindeer.fireRate && trees.length > 0) {
      // Find nearest tree
      let nearestTree = null;
      let nearestDistance = Infinity;
      
      for (const tree of trees) {
        const distance = Math.hypot(reindeer.x - tree.x, reindeer.y - tree.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestTree = tree;
        }
      }
      
      if (nearestTree && nearestDistance < 500) {
        // Predictive targeting - aim where tree will be
        const ornamentSpeed = 400;
        const timeToTarget = nearestDistance / ornamentSpeed;
        
        // Calculate tree's future position
        const difficulty = 1 + (level - 1) * 0.08;
        const slowFactor = slowMoTimer > 0 ? 0.4 : 1;
        const treeFutureY = nearestTree.y + (nearestTree.speed * difficulty * slowFactor * timeToTarget);
        
        // Aim at predicted position
        const angle = Math.atan2(treeFutureY - reindeer.y, nearestTree.x - reindeer.x);
        
        ornaments.push({
          x: reindeer.x,
          y: reindeer.y,
          size: Math.min(canvas.width, canvas.height) / 30 * SCALE.ornament,
          scale: SCALE.ornament,
          vx: Math.cos(angle) * ornamentSpeed,
          vy: Math.sin(angle) * ornamentSpeed,
          damage: 1,
          companion: true // Mark as companion shot
        });
        
        reindeer.fireTimer = 0;
      }
    }
  }
}

function drawCompanionReindeer() {
  if (!reindeerUnlocked || companionReindeer.length === 0) return;
  
  for (const reindeer of companionReindeer) {
    ctx.save();
    ctx.translate(reindeer.x, reindeer.y);
    
    // Add a gentle floating effect
    const floatOffset = Math.sin(Date.now() * 0.005) * 3;
    ctx.translate(0, floatOffset);
    
    // Draw reindeer
    if (images.reindeer.complete && images.reindeer.naturalWidth) {
      const size = reindeer.size;
      ctx.drawImage(images.reindeer, -size / 2, -size / 2, size, size);
    } else {
      // Fallback if image not loaded
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.arc(0, 0, reindeer.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
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
        ornaments.splice(j, 1);
        
        // Handle special ammo effects
        if (ornament.special === "explode") {
          // Create explosion visual effect
          createExplosion(tree.x, tree.y);
          
          // Gold ornament explosion - damage nearby trees with lightning
          const explosionRadius = 120;
          for (let k = trees.length - 1; k >= 0; k--) {
            const otherTree = trees[k];
            const explosionDx = otherTree.x - tree.x;
            const explosionDy = otherTree.y - tree.y;
            const explosionDistance = Math.hypot(explosionDx, explosionDy);
            if (explosionDistance <= explosionRadius && explosionDistance > 0) {
              // Create lightning bolt to each affected tree
              createLightning(tree.x, tree.y, otherTree.x, otherTree.y);
              
              // This tree is in explosion range
              otherTree.health = (otherTree.health || 1) - 1;
              if (otherTree.health <= 0) {
                trees.splice(k, 1);
                treesDestroyed += 1; // Count trees destroyed by explosion
                // Add explosion bonus points
                score += 1; // Bonus point for explosion kill
                totalPoints += 1;
              }
            }
          }
        }
        
        // Apply damage to main target tree
        tree.health = (tree.health || 1) - (ornament.damage || 1);
        if (tree.health <= 0) {
          // Chance to drop presents when tree is destroyed
          const presentChance = Math.random();
          if (presentChance < 0.1) { // 10% chance for blue present
            spawnPresent(tree.x, tree.y, "blue");
          } else if (presentChance < 0.13) { // 3% chance for gold present
            spawnPresent(tree.x, tree.y, "gold");
          }
          
          trees.splice(i, 1);
          treesDestroyed += 1;
          
          // Only increment combo for player shots, not companion shots
          if (!ornament.companion) {
            combo += 1;
          }
          // Apply combo multipliers for skillful play
          const comboMultiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
          const points = 1 * comboMultiplier;
          score += points;
          totalPoints += points;
        }
        scoreEl.textContent = score;

        // Check for level-up (every 10 trees destroyed)
        const newLevel = Math.floor(treesDestroyed / 10) + 1;
        if (newLevel > level) {
          level = newLevel;
          levelMessageTimer = 1.5;

          // Spawn boss every 5 levels
          if (level % 5 === 0 && !bossActive) {
            spawnBoss();
          }
          // Spawn reindeer at milestone levels (3, 6, 9...)
          else if (level >= 3 && level % 3 === 0 && level > lastReindeerLevel) {
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

  // Draw boss tree
  if (bossTree) {
    const bossAspect = images.bossTree.naturalHeight / images.bossTree.naturalWidth || 1;
    const bossW = bossTree.size;
    const bossH = bossTree.size * bossAspect;
    
    // Just draw the boss sprite normally
    ctx.drawImage(
      images.bossTree,
      bossTree.x - bossW * 0.5,
      bossTree.y - bossH * 0.5,
      bossW,
      bossH
    );
    
    // Draw boss health bar
    const barWidth = bossW * 0.8;
    const barHeight = 8;
    const barX = bossTree.x - barWidth * 0.5;
    const barY = bossTree.y - bossH * 0.6;
    
    // Background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    
    // Health bar
    const healthRatio = bossTree.health / bossTree.maxHealth;
    ctx.fillStyle = healthRatio > 0.5 ? "#4CAF50" : healthRatio > 0.25 ? "#FFA500" : "#F44336";
    ctx.fillRect(barX, barY, barWidth * healthRatio, barHeight);
    
    // Border
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

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

  // Draw boss coal projectiles
  coalProjectiles.forEach((coal) => {
    const coalW = coal.size;
    const coalH = coal.size * coalAspect;
    
    // Add red glow for boss projectiles
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = "red";
    
    ctx.drawImage(
      images.coal,
      coal.x - coalW * 0.5,
      coal.y - coalH * 0.5,
      coalW,
      coalH
    );
    ctx.restore();
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

  // Draw presents
  const presentAspect = images.present.naturalHeight / images.present.naturalWidth || 1;
  presents.forEach((present) => {
    const presentImg = images[present.image] || images.present;
    const presentW = present.size;
    const presentH = present.size * presentAspect;
    ctx.drawImage(
      presentImg,
      present.x - presentW * 0.5,
      present.y - presentH * 0.5,
      presentW,
      presentH
    );
  });

  ornaments.forEach((ornament) => {
    // Get the correct image based on ammo type
    const ammoType = ornament.ammoType || "regular";
    const ammo = ammoInventory[ammoType];
    const ornamentImage = images[ammo.image] || images.ornament;
    
    const ornamentAspect = ornamentImage.naturalHeight / ornamentImage.naturalWidth || 1;
    const ornW = ornament.size;
    const ornH = ornament.size * ornamentAspect;
    ctx.drawImage(
      ornamentImage,
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

  // Draw companion reindeer
  drawCompanionReindeer();
  
  // Draw collectible stars
  drawCollectibleStars();

  // Draw explosions
  explosions.forEach((explosion) => {
    ctx.save();
    ctx.globalAlpha = explosion.opacity;
    
    // Draw explosion ring
    const gradient = ctx.createRadialGradient(
      explosion.x, explosion.y, 0,
      explosion.x, explosion.y, explosion.radius
    );
    gradient.addColorStop(0, "rgba(255, 255, 0, 0.8)"); // Bright yellow center
    gradient.addColorStop(0.5, "rgba(255, 165, 0, 0.6)"); // Orange middle
    gradient.addColorStop(1, "rgba(255, 0, 0, 0.2)"); // Red edge
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw shock wave ring
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, explosion.radius * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  });

  // Draw lightning bolts
  lightningBolts.forEach((lightning) => {
    ctx.save();
    ctx.globalAlpha = lightning.opacity;

    // Draw outer glow (golden yellow)
    ctx.strokeStyle = "rgba(255, 215, 0, 0.8)";
    ctx.lineWidth = 12;
    ctx.shadowBlur = 25;
    ctx.shadowColor = "rgba(255, 215, 0, 0.9)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw jagged lightning bolt using pre-generated segments
    ctx.beginPath();
    if (lightning.segments && lightning.segments.length > 0) {
      ctx.moveTo(lightning.segments[0].x, lightning.segments[0].y);
      for (let i = 1; i < lightning.segments.length; i++) {
        ctx.lineTo(lightning.segments[i].x, lightning.segments[i].y);
      }
    }
    ctx.stroke();

    // Draw middle layer (white-yellow)
    ctx.strokeStyle = "rgba(255, 255, 200, 0.95)";
    ctx.lineWidth = 6;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.stroke();

    // Draw bright core (pure white)
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.stroke();

    ctx.restore();
  });

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

  // Draw combo indicator (top-right, below HUD)
  if (combo >= 2) {
    ctx.save();
    const multiplier = combo >= 10 ? 3 : combo >= 5 ? 2 : 1;
    // Christmas-themed colors: festive red, gold, and Christmas green
    ctx.fillStyle = multiplier >= 3 ? "#ffd700" : multiplier >= 2 ? "#dc143c" : "#228b22";
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 4;
    // More festive font styling
    ctx.font = `bold ${Math.min(width, height) * 0.06}px Georgia, serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    // Add subtle shadow for depth
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
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
    ctx.strokeText(comboText, width - 10, 80);
    ctx.fillText(comboText, width - 10, 80);
    // Clear shadow for next elements
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  // Draw power indicators (top-left, below powerups)
  ctx.save();
  ctx.fillStyle = "#FFD700"; // Gold color
  ctx.strokeStyle = "#8B0000"; // Dark red outline
  ctx.lineWidth = 2;
  ctx.font = `bold ${Math.min(width, height) * 0.03}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  
  // Show permanent upgrades
  const fireRateBonus = (playerUpgrades.fireRate * 0.15 * 100).toFixed(0); // Convert to percentage
  const speedBonus = (playerUpgrades.speed * 0.1 * 100).toFixed(0); // Convert to percentage
  
  let powerIndicatorY = powerupY;
  
  // Fire rate indicator
  if (playerUpgrades.fireRate > 0) {
    const fireText = `🔥 +${fireRateBonus}% Fire Rate`;
    ctx.strokeText(fireText, 10, powerIndicatorY);
    ctx.fillText(fireText, 10, powerIndicatorY);
    powerIndicatorY += 25;
  }
  
  // Speed indicator  
  if (playerUpgrades.speed > 0) {
    const speedText = `💨 +${speedBonus}% Speed`;
    ctx.strokeText(speedText, 10, powerIndicatorY);
    ctx.fillText(speedText, 10, powerIndicatorY);
    powerIndicatorY += 25;
  }
  
  // Slow-mo power collected indicator
  if (playerUpgrades.slowMo > 0) {
    const slowMoText = `❄️ x${playerUpgrades.slowMo} Slow Powers`;
    ctx.strokeText(slowMoText, 10, powerIndicatorY);
    ctx.fillText(slowMoText, 10, powerIndicatorY);
    powerIndicatorY += 25;
  }
  
  ctx.restore();

  // Draw version (top-left, below power indicators)
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
  ctx.lineWidth = 2;
  ctx.font = `bold ${Math.min(width, height) * 0.025}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.strokeText(VERSION, 10, powerIndicatorY + 5);
  ctx.fillText(VERSION, 10, powerIndicatorY + 5);
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
    // Only keep slowMoTimer since it's a temporary effect that affects all trees
    slowMoTimer = Math.max(0, slowMoTimer - delta);
    spawnTimer -= delta;
    coalSpawnTimer -= delta;

    // Level-based spawn interval scaling (more gradual)
    const levelDifficulty = Math.min(level * 0.05, 0.8); // Cap at 0.8 reduction
    const spawnInterval = Math.max(0.6, 1.5 - levelDifficulty);
    if (spawnTimer <= 0 && !bossActive) {
      spawnTree();
      // Level-scaled powerup spawning: higher levels get more powerups
      const basePowerupChance = 0.05;
      const levelBonus = Math.min(level * 0.005, 0.03); // Max 3% bonus
      const totalPowerupChance = basePowerupChance + levelBonus;
      
      const powerupRoll = Math.random();
      const thirdChance = totalPowerupChance / 3;
      
      if (powerupRoll < thirdChance) {
        spawnStocking();
      } else if (powerupRoll < thirdChance * 2) {
        spawnSnowflake();
      } else if (powerupRoll < totalPowerupChance) {
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
    updatePresents(delta);
    updateExplosions(delta);
    updateLightning(delta);
    updateBoss(delta);
    updateCoalProjectiles(delta);
    updateReindeer(delta);
    updateCompanionReindeer(delta);
    updateCollectibleStars(delta);
    checkCollisions();
    checkBossCollisions();
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
    
    const isUnlocked = unlockedCharacters[key] || char.cost === 0;
    const canAfford = totalPoints >= char.cost;
    const isSelected = key === selectedCharacter;
    
    if (!isUnlocked && char.cost > 0) {
      card.classList.add("locked");
    }
    if (!isUnlocked && canAfford && char.cost > 0) {
      card.classList.add("can-afford");
    }
    if (isSelected) {
      card.classList.add("selected");
    }
    
    const img = document.createElement("img");
    img.src = key === "frosty" ? "snowman.png" : key === "msClaus" ? "Ms_Clause.png" : key === "santa" ? "Santa.png" : `${key}.png`;
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
    } else if (canAfford) {
      cost.textContent = `UNLOCK: ${char.cost} points`;
    } else {
      cost.textContent = `NEED: ${char.cost} points`;
    }
    
    const special = document.createElement("div");
    special.className = "character-special";
    special.textContent = char.special;
    
    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(cost);
    card.appendChild(special);
    
    card.addEventListener("click", () => {
      if (isUnlocked) {
        // Character is already unlocked, just select it
        selectedCharacter = key;
        localStorage.setItem("selectedCharacter", selectedCharacter);
        renderCharacters();
      } else if (canAfford && char.cost > 0) {
        // Purchase character
        totalPoints -= char.cost;
        unlockedCharacters[key] = true;
        localStorage.setItem("totalPoints", totalPoints);
        localStorage.setItem("unlockedCharacters", JSON.stringify(unlockedCharacters));
        selectedCharacter = key;
        localStorage.setItem("selectedCharacter", selectedCharacter);
        renderCharacters();
      } else if (char.cost === 0) {
        // Free character (Santa)
        selectedCharacter = key;
        localStorage.setItem("selectedCharacter", selectedCharacter);
        renderCharacters();
      }
    });
    
    characterGrid.appendChild(card);
  });
}

function updateControlsForCharacter() {
  if (selectedCharacter === "kasie") {
    fireButton.style.display = "none";
    fireJoystick.style.display = "block";
  } else {
    fireButton.style.display = "block";
    fireJoystick.style.display = "none";
  }
  updateJoystickBounds();
}

function startGame() {
  if (characterSelect.style.display === "block") {
    characterSelect.style.display = "none";
    overlayMessage.style.display = "block";
  }
  
  resetGame();
  updateScale(); // Update scale for selected character
  updateControlsForCharacter(); // Update controls for selected character
  overlayTitle.textContent = "Ready to Play?";
  overlayMessage.textContent =
    `Move ${CHARACTERS[selectedCharacter].name} with the left joystick. ${selectedCharacter === 'kasie' ? 'Use right joystick to aim and fire!' : 'Tap Fire to launch ornaments.'} Stop the trees before they land.`;
  startButton.textContent = "Start";
  setGameState("playing");
  startMusic();
}

function handlePointerMove(event) {
  // Handle movement joystick
  if (joystickState.active && joystickState.pointerId === event.pointerId) {
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
  
  // Handle fire joystick
  if (fireJoystickState.active && fireJoystickState.pointerId === event.pointerId) {
    const dx = event.clientX - fireJoystickState.center.x;
    const dy = event.clientY - fireJoystickState.center.y;
    const distance = Math.hypot(dx, dy);
    const max = fireJoystickState.radius;
    const ratio = distance > max ? max / distance : 1;
    const clampedX = dx * ratio;
    const clampedY = dy * ratio;

    fireJoystickState.vector.x = clampedX / max;
    fireJoystickState.vector.y = clampedY / max;
    fireJoystickStick.style.transform = `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`;
  }
}

function resetJoystick(event) {
  // Reset movement joystick
  if (!event || event.pointerId === joystickState.pointerId) {
    joystickState.active = false;
    joystickState.pointerId = null;
    joystickState.vector.x = 0;
    joystickState.vector.y = 0;
    joystickStick.style.transform = "translate(-50%, -50%)";
  }
  
  // Reset fire joystick
  if (!event || event.pointerId === fireJoystickState.pointerId) {
    fireJoystickState.active = false;
    fireJoystickState.pointerId = null;
    fireJoystickState.vector.x = 0;
    fireJoystickState.vector.y = 0;
    fireJoystickStick.style.transform = "translate(-50%, -50%)";
  }
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
    case "q":
      if (isDown) {
        // Cycle ammo backward
        const ammoTypes = ["regular", "blue", "gold"];
        const currentIndex = ammoTypes.indexOf(currentAmmoType);
        const newIndex = (currentIndex - 1 + ammoTypes.length) % ammoTypes.length;
        switchAmmo(ammoTypes[newIndex]);
      }
      break;
    case "e":
      if (isDown) {
        // Cycle ammo forward
        const ammoTypes = ["regular", "blue", "gold"];
        const currentIndex = ammoTypes.indexOf(currentAmmoType);
        const newIndex = (currentIndex + 1) % ammoTypes.length;
        switchAmmo(ammoTypes[newIndex]);
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
    { key: "blueOrnament", src: "blue_ornament.png" },
    { key: "goldOrnament", src: "gold_ornament.png" },
    { key: "present", src: "present.png" },
    { key: "bluePresent", src: "blue_present.png" },
    { key: "bossTree", src: "boss_tree.png" },
    { key: "star", src: "star.png" },
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

fireJoystick.addEventListener("pointerdown", (event) => {
  fireJoystickState.active = true;
  fireJoystickState.pointerId = event.pointerId;
  fireJoystick.setPointerCapture(event.pointerId);
  handlePointerMove(event);
});

window.addEventListener("pointermove", handlePointerMove);
window.addEventListener("pointerup", resetJoystick);
window.addEventListener("pointercancel", resetJoystick);

fireButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  fireOrnament();
});

// Ammo selector functionality
function switchAmmo(ammoType) {
  // Only switch if we have ammo or it's regular
  if (ammoType === "regular" || ammoInventory[ammoType].count > 0) {
    currentAmmoType = ammoType;
    updateAmmoUI();
  }
}

function updateAmmoUI() {
  // Update button states
  document.querySelectorAll(".ammo-button").forEach(button => {
    button.classList.remove("active");
  });
  document.getElementById(`ammo${currentAmmoType.charAt(0).toUpperCase() + currentAmmoType.slice(1)}`).classList.add("active");
  
  // Update ammo counts
  document.getElementById("ammoRegular").querySelector(".ammo-count").textContent = "∞";
  document.getElementById("ammoBlue").querySelector(".ammo-count").textContent = ammoInventory.blue.count;
  document.getElementById("ammoGold").querySelector(".ammo-count").textContent = ammoInventory.gold.count;
  
  // Disable buttons for empty ammo
  const blueButton = document.getElementById("ammoBlue");
  const goldButton = document.getElementById("ammoGold");
  
  blueButton.style.opacity = ammoInventory.blue.count > 0 ? "1" : "0.5";
  goldButton.style.opacity = ammoInventory.gold.count > 0 ? "1" : "0.5";
  
  // Auto-switch to regular if current ammo is empty
  if (currentAmmoType !== "regular" && ammoInventory[currentAmmoType].count <= 0) {
    currentAmmoType = "regular";
    document.querySelectorAll(".ammo-button").forEach(button => {
      button.classList.remove("active");
    });
    document.getElementById("ammoRegular").classList.add("active");
  }
}

// Add ammo selector event listeners
document.getElementById("ammoRegular").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  switchAmmo("regular");
});
document.getElementById("ammoBlue").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (ammoInventory.blue.count > 0) switchAmmo("blue");
});
document.getElementById("ammoGold").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (ammoInventory.gold.count > 0) switchAmmo("gold");
});

startButton.addEventListener("click", () => {
  if (characterSelect.style.display === "block") {
    startGame();
  } else if (gameState === "ready" || gameState === "over") {
    showCharacterSelect();
  }
});

document.getElementById("musicButton").addEventListener("click", toggleMusic);

overlay.addEventListener("click", (event) => {
  // Only handle clicks outside the overlay card
  if (event.target === overlay) {
    if (characterSelect.style.display === "block") {
      // Character selection is open, do nothing
      return;
    } else if (gameState === "ready" || gameState === "over") {
      showCharacterSelect();
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

// Service workers don't work with file:// protocol, only register if using http(s)
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.log("Service worker registration failed:", err);
    });
  });
}
