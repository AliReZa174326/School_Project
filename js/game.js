 
// =====================================================
// OPERATION: STRIKE
// VERSION 0.8 - AUDIO SYSTEM
// =====================================================

"use strict";

// -------------------- CANVAS --------------------

const canvas = document.getElementById("gameCanvas");
if (!canvas) throw new Error('Canvas with id="gameCanvas" was not found.');

const ctx = canvas.getContext("2d");
const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
canvas.tabIndex = 0;

// -------------------- AUDIO --------------------

// Both audio files are stored directly inside assets/sounds/
const backgroundMusic = new Audio("assets/sounds/01. Hive Knight.flac");
backgroundMusic.loop = true;
backgroundMusic.volume = 0.28;
backgroundMusic.preload = "auto";

const shotSound = new Audio("assets/sounds/lazer-transitions-stinger-3shwvhqy.wav");
shotSound.volume = 0.45;
shotSound.preload = "auto";

let audioStarted = false;

function startBackgroundMusic() {
  if (audioStarted) {
    if (backgroundMusic.paused) {
      backgroundMusic.play().catch(() => {});
    }
    return;
  }

  audioStarted = true;
  backgroundMusic.play().catch(error => {
    console.warn("Background music could not start:", error);
  });
}

function pauseBackgroundMusic() {
  backgroundMusic.pause();
}

function playShotSound() {
  // Clone the sound so rapid shots do not cut off the previous sound.
  const sound = shotSound.cloneNode();
  sound.volume = shotSound.volume;
  sound.play().catch(() => {});
}

// -------------------- STYLE & UI --------------------

const uiStyle = document.createElement("style");
uiStyle.textContent = `
#os-ui { color:#e5e9dc; font-family:Arial,sans-serif; margin-top:14px; }
#os-toolbar { display:flex; flex-wrap:wrap; gap:9px; justify-content:center; }
.os-btn {
  border:1px solid #718653; background:linear-gradient(#293829,#172219);
  color:#e5e9dc; padding:11px 16px; min-height:42px; border-radius:4px;
  font-weight:bold; letter-spacing:.5px; cursor:pointer;
}
.os-btn:hover { background:#3a4b35; border-color:#c4d68e; }
.os-btn:disabled { opacity:.4; cursor:not-allowed; }
#os-status {
  display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px;
  margin-top:10px; padding:10px 13px; background:#0c130e;
  border:1px solid rgba(150,174,112,.2); color:#b7c3a8; font-size:12px;
}
#os-overlay {
  position:fixed; inset:0; z-index:9999; display:none; align-items:center;
  justify-content:center; padding:16px; background:rgba(0,0,0,.78);
}
#os-panel {
  width:min(680px,100%); max-height:85vh; overflow:auto; padding:22px;
  background:linear-gradient(145deg,#202c21,#101811); border:1px solid #718653;
  box-shadow:0 20px 70px #000; color:#e5e9dc;
}
#os-panel h2 { color:#c4d68e; margin-bottom:8px; letter-spacing:2px; }
#os-panel p { color:#aab69e; line-height:1.5; margin:8px 0 14px; }
#os-items { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; }
.os-item { padding:12px; background:#111a13; border:1px solid #40513b; }
.os-item strong { color:#d4e0bd; display:block; margin-bottom:6px; }
.os-item small { display:block; color:#9ba991; min-height:34px; line-height:1.4; }
.os-item button { margin-top:10px; width:100%; }
#os-panel-actions { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
#os-mobile {
  display:none; position:relative; height:150px; margin-top:12px;
  touch-action:none; user-select:none;
}
.os-stick {
  position:absolute; bottom:5px; width:118px; height:118px; border-radius:50%;
  background:rgba(95,116,74,.22); border:2px solid rgba(180,200,145,.45);
  touch-action:none;
}
#os-move-stick { left:12px; }
#os-aim-stick { right:12px; }
.os-knob {
  position:absolute; width:48px; height:48px; left:33px; top:33px;
  border-radius:50%; background:rgba(190,210,150,.7);
  border:2px solid #d3e0b7; pointer-events:none;
}
#os-mobile-actions {
  position:absolute; right:145px; bottom:12px; display:flex; gap:8px;
}
.os-touch-btn {
  width:65px; height:65px; border-radius:50%; padding:4px;
  border:2px solid #a6bb7c; background:rgba(45,65,39,.85);
  color:white; font-size:11px; font-weight:bold; touch-action:none;
}
#os-fire { width:78px; height:78px; background:rgba(130,55,40,.88); border-color:#d27b61; }
#os-author {
  margin-top:12px; text-align:center; color:#7f8d73; font-size:11px;
  letter-spacing:1.5px;
}
@media (pointer:coarse), (max-width:760px) {
  #os-mobile { display:block; }
  #os-toolbar .os-btn { flex:1 1 30%; padding:10px 7px; font-size:11px; }
  #os-status { font-size:11px; }
  #os-author { font-size:10px; }
  .game-container { padding:12px !important; }
}
`;
document.head.appendChild(uiStyle);

const gameContainer = document.querySelector(".game-container") || canvas.parentElement;
const ui = document.createElement("section");
ui.id = "os-ui";
ui.innerHTML = `
  <div id="os-toolbar">
    <button class="os-btn" id="os-shop">▣ فروشگاه</button>
    <button class="os-btn" id="os-upgrades">⬆ ارتقای مهارت</button>
    <button class="os-btn" id="os-pause">Ⅱ توقف</button>
  </div>
  <div id="os-status">
    <span id="os-money">اعتبار: ۰</span>
    <span id="os-weapon">سلاح: تهاجمی</span>
    <span id="os-ammo">مهمات: ∞</span>
    <span id="os-wave">موج: ۱</span>
  </div>
  <div id="os-mobile">
    <div class="os-stick" id="os-move-stick"><div class="os-knob"></div></div>
    <div class="os-stick" id="os-aim-stick"><div class="os-knob"></div></div>
    <div id="os-mobile-actions">
      <button class="os-touch-btn" id="os-pause-touch">Ⅱ</button>
      <button class="os-touch-btn" id="os-fire">شلیک</button>
    </div>
  </div>
  <div id="os-author">ساخته شده توسط علیرضا یوسفی</div>
`;
gameContainer.appendChild(ui);

const overlay = document.createElement("div");
overlay.id = "os-overlay";
overlay.innerHTML = `
  <div id="os-panel">
    <h2 id="os-panel-title">OPERATION: STRIKE</h2>
    <p id="os-panel-description"></p>
    <div id="os-items"></div>
    <div id="os-panel-actions">
      <button class="os-btn" id="os-resume">بازگشت به بازی</button>
    </div>
  </div>
`;
document.body.appendChild(overlay);

const $ = id => document.getElementById(id);
const moneyLabel = $("os-money");
const weaponLabel = $("os-weapon");
const ammoLabel = $("os-ammo");
const waveLabel = $("os-wave");

// -------------------- GAME STATE --------------------

let gameState = "menu";
let money = 0;
let wave = 1;
let enemiesToSpawn = 0;
let spawnTimer = 0;
let lastTime = 0;
let screenShake = 0;
let kills = 0;
let fireHeld = false;
let lastMobileShot = 0;

const keys = {};
const mouse = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };

const player = {
  x: 500, y: 300, speed: 3.7, angle: 0, radius: 15,
  health: 100, maxHealth: 100, lastDamage: 0,
  damageCooldown: 700, moving: false,
  upgrades: { health: 0, speed: 0, damage: 0, fireRate: 0 }
};

const weaponCatalog = [
  { id:"rifle", name:"تفنگ تهاجمی", cost:0, damage:35, fireRate:220, bulletSpeed:10, magazine:30, color:"#f4d68c", description:"سلاح متعادل برای شروع مأموریت." },
  { id:"smg", name:"مسلسل سبک", cost:450, damage:19, fireRate:95, bulletSpeed:11, magazine:45, color:"#ffe09b", description:"سرعت شلیک بالا و مناسب دشمنان سریع." },
  { id:"shotgun", name:"شاتگان", cost:650, damage:18, fireRate:650, bulletSpeed:9, magazine:8, pellets:5, spread:.22, color:"#ffd18a", description:"چند پرتابه در هر شلیک، مناسب فاصله نزدیک." },
  { id:"marksman", name:"تفنگ دقیق", cost:900, damage:105, fireRate:850, bulletSpeed:15, magazine:10, color:"#d8e5ff", description:"قدرت زیاد و سرعت شلیک کمتر." },
  { id:"lmg", name:"مسلسل سنگین", cost:1250, damage:28, fireRate:145, bulletSpeed:10, magazine:80, color:"#ffe0a1", description:"خشاب بزرگ و مناسب موج‌های شلوغ." }
];

let ownedWeapons = ["rifle"];
let currentWeaponId = "rifle";
let weapon = null;
let ammo = 30;
let reloadTimer = 0;

function equipWeapon(id) {
  const selected = weaponCatalog.find(w => w.id === id);
  if (!selected || !ownedWeapons.includes(id)) return;
  currentWeaponId = id;
  weapon = { ...selected, lastShot: 0 };
  ammo = weapon.magazine;
  reloadTimer = 0;
  updateStatus();
}
equipWeapon("rifle");

const enemies = [];
const bullets = [];
const enemyShots = [];
const particles = [];
const floatingTexts = [];

const enemyTypes = {
  grunt:   { name:"سرباز", health:90, speed:1.05, radius:15, reward:65, damage:9, color:"#8b5745", style:"melee" },
  runner:  { name:"سریع", health:55, speed:2.25, radius:12, reward:85, damage:8, color:"#b58a48", style:"melee" },
  sniper:  { name:"تک‌تیرانداز", health:75, speed:.72, radius:14, reward:120, damage:13, color:"#647a9b", style:"ranged", range:330, fireRate:1700 },
  heavy:   { name:"سنگین", health:260, speed:.58, radius:21, reward:180, damage:17, color:"#5d6650", style:"melee" },
  bomber:  { name:"انفجاری", health:80, speed:1.65, radius:16, reward:140, damage:22, color:"#bd7542", style:"bomber" },
  boss:    { name:"غول", health:1000, speed:.72, radius:29, reward:650, damage:25, color:"#9b4141", style:"boss" }
};

const obstacles = [
  {x:40,y:40,width:190,height:120,type:"building"},
  {x:760,y:40,width:190,height:120,type:"building"},
  {x:40,y:420,width:190,height:130,type:"building"},
  {x:760,y:420,width:190,height:130,type:"building"},
  {x:300,y:100,width:40,height:40,type:"crate"},
  {x:350,y:100,width:40,height:40,type:"crate"},
  {x:650,y:450,width:40,height:40,type:"crate"},
  {x:700,y:450,width:40,height:40,type:"crate"},
  {x:300,y:380,width:100,height:20,type:"barrier"},
  {x:650,y:180,width:100,height:20,type:"barrier"}
];

// -------------------- INPUT: KEYBOARD & MOUSE --------------------

window.addEventListener("keydown", event => {
  if (["KeyW","KeyA","KeyS","KeyD","Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
  keys[event.code] = true;

  if (event.code === "Enter" && gameState === "menu") startGame();
  if (event.code === "KeyR" && gameState === "gameover") startGame();
  if (event.code === "Escape") togglePause();
  if (event.code === "KeyF" && gameState === "playing") openShop();
});

window.addEventListener("keyup", event => { keys[event.code] = false; });
window.addEventListener("blur", () => {
  Object.keys(keys).forEach(key => keys[key] = false);
  fireHeld = false;
  resetStick("move");
  resetStick("aim");
});

function pointerToGame(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x:(event.clientX-rect.left)*(GAME_WIDTH/rect.width),
    y:(event.clientY-rect.top)*(GAME_HEIGHT/rect.height)
  };
}

canvas.addEventListener("pointermove", event => {
  if (event.pointerType === "mouse") Object.assign(mouse, pointerToGame(event));
});
canvas.addEventListener("pointerdown", event => {
  if (event.pointerType !== "mouse") return;
  canvas.focus();
  if (gameState === "menu") { startGame(); return; }
  if (gameState === "playing" && event.button === 0) shootPlayerWeapon();
});

// -------------------- MOBILE CONTROLS --------------------

const mobileInput = {
  moveX:0, moveY:0, aimX:0, aimY:-1,
  aimActive:false
};

function setupStick(id, type) {
  const base = $(id);
  if (!base) return;
  const knob = base.querySelector(".os-knob");
  let pointerId = null;

  base.addEventListener("pointerdown", event => {
    event.preventDefault();
    pointerId = event.pointerId;
    base.setPointerCapture(pointerId);
    moveStick(event);
  });

  base.addEventListener("pointermove", event => {
    if (event.pointerId === pointerId) moveStick(event);
  });

  function moveStick(event) {
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width/2;
    const centerY = rect.top + rect.height/2;
    let dx = (event.clientX-centerX)/ (rect.width/2);
    let dy = (event.clientY-centerY)/ (rect.height/2);
    const length = Math.hypot(dx,dy);
    if (length > 1) { dx/=length; dy/=length; }
    knob.style.transform = `translate(${dx*34}px,${dy*34}px)`;
    if (type === "move") {
      mobileInput.moveX = dx;
      mobileInput.moveY = dy;
    } else {
      mobileInput.aimX = dx;
      mobileInput.aimY = dy;
      mobileInput.aimActive = length > .18;
    }
  }

  const release = event => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    resetStick(type);
  };
  base.addEventListener("pointerup", release);
  base.addEventListener("pointercancel", release);
}

function resetStick(type) {
  const id = type === "move" ? "os-move-stick" : "os-aim-stick";
  const base = $(id);
  if (base) base.querySelector(".os-knob").style.transform = "translate(0,0)";
  if (type === "move") { mobileInput.moveX=0; mobileInput.moveY=0; }
  else { mobileInput.aimX=0; mobileInput.aimY=-1; mobileInput.aimActive=false; }
}

setupStick("os-move-stick","move");
setupStick("os-aim-stick","aim");

$("os-fire").addEventListener("pointerdown", event => {
  event.preventDefault();
  fireHeld = true;
  if (gameState === "menu") startGame();
});
["pointerup","pointercancel","pointerleave"].forEach(name => {
  $("os-fire").addEventListener(name, () => fireHeld = false);
});
$("os-pause").addEventListener("click", togglePause);
$("os-pause-touch").addEventListener("click", togglePause);
$("os-shop").addEventListener("click", openShop);
$("os-upgrades").addEventListener("click", openUpgrades);
$("os-resume").addEventListener("click", closeOverlay);

// -------------------- GAME MANAGEMENT --------------------

function startGame() {
  gameState = "playing";
  startBackgroundMusic();
  money = 0;
  wave = 1;
  kills = 0;
  player.x = 500; player.y = 300;
  player.health = player.maxHealth;
  player.lastDamage = 0;
  player.upgrades = {health:0,speed:0,damage:0,fireRate:0};
  ownedWeapons = ["rifle"];
  equipWeapon("rifle");
  bullets.length = 0;
  enemyShots.length = 0;
  enemies.length = 0;
  particles.length = 0;
  floatingTexts.length = 0;
  overlay.style.display = "none";
  startWave();
  canvas.focus();
  updateStatus();
}

function startWave() {
  enemiesToSpawn = Math.min(5 + wave*2, 30);
  if (wave % 5 === 0) enemiesToSpawn += 1;
  spawnTimer = 0;
}

function endWaveIfClear() {
  if (enemies.length === 0 && enemiesToSpawn === 0 && gameState === "playing") {
    money += 100 + wave*25;
    addFloatingText(player.x, player.y-35, `+${100+wave*25} اعتبار`, "#d5e7a4");
    wave++;
    startWave();
    updateStatus();
  }
}

// -------------------- COLLISION --------------------

function circleRectCollision(circle, rect) {
  const closestX = Math.max(rect.x,Math.min(circle.x,rect.x+rect.width));
  const closestY = Math.max(rect.y,Math.min(circle.y,rect.y+rect.height));
  const dx = circle.x-closestX, dy = circle.y-closestY;
  return dx*dx+dy*dy < circle.radius*circle.radius;
}
function isCollidingWithObstacle(object) {
  return obstacles.some(obstacle => circleRectCollision(object,obstacle));
}
function keepInsideMap(object) {
  object.x = Math.max(object.radius,Math.min(GAME_WIDTH-object.radius,object.x));
  object.y = Math.max(object.radius,Math.min(GAME_HEIGHT-object.radius,object.y));
}
function moveWithCollision(object, dx, dy) {
  object.x += dx; keepInsideMap(object);
  if (isCollidingWithObstacle(object)) object.x -= dx;
  object.y += dy; keepInsideMap(object);
  if (isCollidingWithObstacle(object)) object.y -= dy;
}

// -------------------- ENEMY SPAWNING & AI --------------------

function chooseEnemyType() {
  if (wave % 5 === 0 && enemiesToSpawn === 1) return "boss";
  const pool = ["grunt","grunt","runner"];
  if (wave >= 2) pool.push("sniper");
  if (wave >= 3) pool.push("heavy","bomber");
  if (wave >= 5) pool.push("runner","sniper","heavy");
  return pool[Math.floor(Math.random()*pool.length)];
}

function spawnEnemy() {
  const side = Math.floor(Math.random()*4);
  let x = side===1 ? GAME_WIDTH-20 : side===3 ? 20 : Math.random()*(GAME_WIDTH-80)+40;
  let y = side===0 ? 20 : side===2 ? GAME_HEIGHT-20 : Math.random()*(GAME_HEIGHT-80)+40;
  const typeId = chooseEnemyType();
  const config = enemyTypes[typeId];
  const scale = 1 + (wave-1)*.09;

  const enemy = {
    type:typeId, x, y, radius:config.radius,
    health:Math.round(config.health*scale), maxHealth:Math.round(config.health*scale),
    speed:config.speed*(1+Math.min(wave-1,12)*.025),
    reward:config.reward, damage:config.damage,
    color:config.color, style:config.style,
    hitFlash:0, attackCooldown:700+Math.random()*500,
    attackTimer:900+Math.random()*700,
    fuse:0, warning:0, strafe:Math.random()<.5?-1:1
  };
  enemies.push(enemy);
}

function updateEnemies(dt) {
  if (enemiesToSpawn > 0) {
    spawnTimer += dt;
    if (spawnTimer >= Math.max(420,1050-wave*25)) {
      spawnEnemy();
      enemiesToSpawn--;
      spawnTimer = 0;
    }
  }

  const scale = dt/16.67;
  for (let i=enemies.length-1;i>=0;i--) {
    const e = enemies[i];
    const dx = player.x-e.x, dy = player.y-e.y;
    const distance = Math.max(1,Math.hypot(dx,dy));
    const nx = dx/distance, ny = dy/distance;
    e.attackTimer -= dt;
    e.attackCooldown -= dt;
    e.hitFlash = Math.max(0,e.hitFlash-dt);
    e.warning = Math.max(0,e.warning-dt);

    if (e.style === "ranged") {
      if (distance > 245) moveWithCollision(e,nx*e.speed*scale,ny*e.speed*scale);
      else if (distance < 175) moveWithCollision(e,-nx*e.speed*.75*scale,-ny*e.speed*.75*scale);
      else moveWithCollision(e,-ny*e.speed*.25*e.strafe*scale,nx*e.speed*.25*e.strafe*scale);
      if (e.attackTimer <= 0 && distance < 430) {
        enemyShots.push({
          x:e.x+nx*18,y:e.y+ny*18,vx:nx*4.2,vy:ny*4.2,
          radius:5,damage:e.damage,color:"#e6a06e"
        });
        e.attackTimer = e.type==="sniper" ? 1900 : 2500;
        e.warning = 250;
      }
    } else if (e.style === "bomber") {
      moveWithCollision(e,nx*e.speed*scale,ny*e.speed*scale);
      if (distance < 100) {
        e.fuse += dt;
        if (e.fuse > 1100) {
          createBurst(e.x,e.y,"#e9a65b",24);
          if (distance < 115) damagePlayer(e.damage);
          enemies.splice(i,1);
          continue;
        }
      } else e.fuse = Math.max(0,e.fuse-dt*.5);
    } else {
      moveWithCollision(e,nx*e.speed*scale,ny*e.speed*scale);
    }

    if (distance < player.radius+e.radius+3 && e.style !== "bomber") {
      damagePlayer(e.damage);
    }
    if (e.type === "boss" && e.attackCooldown <= 0 && distance < 390) {
      for (let n=-1;n<=1;n++) {
        const angle = Math.atan2(dy,dx)+n*.22;
        enemyShots.push({
          x:e.x,y:e.y,vx:Math.cos(angle)*3.5,vy:Math.sin(angle)*3.5,
          radius:7,damage:12,color:"#e47a68"
        });
      }
      e.attackCooldown = 2200;
    }
  }
  endWaveIfClear();
}

function damagePlayer(amount) {
  const now = performance.now();
  if (now-player.lastDamage < player.damageCooldown) return;
  player.lastDamage = now;
  player.health = Math.max(0,player.health-amount);
  screenShake = 6;
  if (player.health <= 0) {
    gameState = "gameover";
    pauseBackgroundMusic();
    showGameOver();
  }
}

// -------------------- PLAYER MOVEMENT & AIM --------------------

function updatePlayer(dt) {
  let mx = (keys.KeyD?1:0)-(keys.KeyA?1:0);
  let my = (keys.KeyS?1:0)-(keys.KeyW?1:0);
  mx += mobileInput.moveX;
  my += mobileInput.moveY;
  const length = Math.hypot(mx,my);
  player.moving = length > .12;
  if (length > 1) { mx/=length; my/=length; }
  const scale = dt/16.67;
  const speed = player.speed + player.upgrades.speed*.35;
  moveWithCollision(player,mx*speed*scale,my*speed*scale);

  if (mobileInput.aimActive) {
    player.angle = Math.atan2(mobileInput.aimX,-mobileInput.aimY);
  } else {
    const dx=mouse.x-player.x, dy=mouse.y-player.y;
    player.angle=Math.atan2(dx,-dy);
  }
}

function currentDamage() {
  return weapon.damage + player.upgrades.damage*8;
}
function currentFireRate() {
  return Math.max(65,weapon.fireRate-player.upgrades.fireRate*16);
}

function shootPlayerWeapon() {
  if (gameState !== "playing" || reloadTimer > 0) return;
  const now = performance.now();
  if (now-weapon.lastShot < currentFireRate()) return;
  if (ammo <= 0) { reloadTimer=1100; return; }
  weapon.lastShot=now;
  ammo--;
  playShotSound();

  const count=weapon.pellets||1;
  for(let i=0;i<count;i++) {
    const spread=(Math.random()-.5)*(weapon.spread||.025);
    const angle=player.angle+spread;
    const dx=Math.sin(angle), dy=-Math.cos(angle);
    const x=player.x+dx*34, y=player.y+dy*34;
    bullets.push({
      x,y,previousX:x,previousY:y,
      vx:dx*weapon.bulletSpeed,vy:dy*weapon.bulletSpeed,
      radius:weapon.id==="marksman"?5:3.5,
      damage:currentDamage(),color:weapon.color
    });
  }
  createBurst(player.x+Math.sin(player.angle)*35,player.y-Math.cos(player.angle)*35,"#f5d58c",4);
  updateStatus();
}

function updateReload(dt) {
  if (reloadTimer>0) {
    reloadTimer-=dt;
    if (reloadTimer<=0) { ammo=weapon.magazine; reloadTimer=0; }
  }
  if (fireHeld && performance.now()-lastMobileShot>55) {
    shootPlayerWeapon();
    lastMobileShot=performance.now();
  }
}

// -------------------- PROJECTILES --------------------

function updateBullets(dt) {
  const scale=dt/16.67;
  for(let i=bullets.length-1;i>=0;i--) {
    const b=bullets[i];
    b.previousX=b.x; b.previousY=b.y;
    b.x+=b.vx*scale; b.y+=b.vy*scale;
    if(b.x<0||b.x>GAME_WIDTH||b.y<0||b.y>GAME_HEIGHT||isCollidingWithObstacle(b)) {
      bullets.splice(i,1); continue;
    }
  }
  for(let i=enemyShots.length-1;i>=0;i--) {
    const b=enemyShots[i];
    b.x+=b.vx*scale; b.y+=b.vy*scale;
    const d=Math.hypot(b.x-player.x,b.y-player.y);
    if(d<player.radius+b.radius) {
      damagePlayer(b.damage);
      createBurst(b.x,b.y,b.color,5);
      enemyShots.splice(i,1);
    } else if(b.x<0||b.x>GAME_WIDTH||b.y<0||b.y>GAME_HEIGHT||isCollidingWithObstacle(b)) {
      enemyShots.splice(i,1);
    }
  }
}

function checkBulletCollisions() {
  for(let i=bullets.length-1;i>=0;i--) {
    const b=bullets[i];
    let hit=false;
    for(let j=enemies.length-1;j>=0;j--) {
      const e=enemies[j];
      if(Math.hypot(b.x-e.x,b.y-e.y)<b.radius+e.radius) {
        e.health-=b.damage;
        e.hitFlash=110;
        createBurst(b.x,b.y,"#d8bd8b",5);
        bullets.splice(i,1);
        hit=true;
        if(e.health<=0) {
          money+=e.reward;
          kills++;
          addFloatingText(e.x,e.y-25,`+${e.reward}`,"#d5e7a4");
          createBurst(e.x,e.y,e.color,12);
          enemies.splice(j,1);
        }
        break;
      }
    }
    if(hit) continue;
  }
}

// -------------------- PARTICLES & TEXT --------------------

function createBurst(x,y,color,count=8) {
  for(let i=0;i<count;i++) {
    const a=Math.random()*Math.PI*2, s=Math.random()*3+1;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:260+Math.random()*220,color});
  }
}
function addFloatingText(x,y,text,color) {
  floatingTexts.push({x,y,text,color,life:900});
}
function updateEffects(dt) {
  const scale=dt/16.67;
  for(let i=particles.length-1;i>=0;i--) {
    const p=particles[i]; p.x+=p.vx*scale; p.y+=p.vy*scale; p.life-=dt;
    if(p.life<=0) particles.splice(i,1);
  }
  for(let i=floatingTexts.length-1;i>=0;i--) {
    const t=floatingTexts[i]; t.y-=.35*scale; t.life-=dt;
    if(t.life<=0) floatingTexts.splice(i,1);
  }
}

// -------------------- SHOP & UPGRADES --------------------

function showPanel(title,description,items) {
  $("os-panel-title").textContent=title;
  $("os-panel-description").textContent=description;
  const list=$("os-items");
  list.innerHTML="";
  items.forEach(item=>list.appendChild(item));
  overlay.style.display="flex";
}

function makeShopCard(item) {
  const card=document.createElement("div");
  card.className="os-item";
  const owned=ownedWeapons.includes(item.id);
  const equipped=currentWeaponId===item.id;
  card.innerHTML=`<strong>${item.name}</strong><small>قدرت: ${item.damage} | قیمت: ${item.cost} اعتبار<br>${item.description}</small>`;
  const button=document.createElement("button");
  button.className="os-btn";
  button.textContent=equipped?"مجهز است":owned?"انتخاب سلاح":`خرید ${item.cost}`;
  button.disabled=equipped||(!owned&&money<item.cost);
  button.addEventListener("click",()=>{
    if(ownedWeapons.includes(item.id)) {
      equipWeapon(item.id);
    } else if(money>=item.cost) {
      money-=item.cost;
      ownedWeapons.push(item.id);
      equipWeapon(item.id);
    }
    openShop();
    updateStatus();
  });
  card.appendChild(button);
  return card;
}

function openShop() {
  if(!["playing","paused","shop"].includes(gameState)) return;
  gameState="shop";
  fireHeld=false;
  pauseBackgroundMusic();
  const cards=weaponCatalog.map(makeShopCard);
  showPanel("فروشگاه تسلیحات",`اعتبار شما: ${money} | خرید سلاح‌ها از اعتبار همین دست کم می‌شود.`,cards);
  $("os-resume").textContent="بازگشت به بازی";
}

const upgradeCatalog = [
  {id:"health",name:"سلامتی بیشتر",base:180,desc:"افزایش حداکثر سلامتی به اندازه ۲۰ واحد.",max:5},
  {id:"speed",name:"سرعت حرکت",base:220,desc:"افزایش سرعت حرکت بازیکن.",max:5},
  {id:"damage",name:"قدرت شلیک",base:260,desc:"افزایش آسیب هر گلوله.",max:6},
  {id:"fireRate",name:"سرعت شلیک",base:300,desc:"کاهش فاصله زمانی بین شلیک‌ها.",max:5}
];

function makeUpgradeCard(item) {
  const level=player.upgrades[item.id];
  const cost=item.base*(level+1);
  const card=document.createElement("div");
  card.className="os-item";
  card.innerHTML=`<strong>${item.name} | سطح ${level}/${item.max}</strong><small>${item.desc}<br>هزینه ارتقا: ${cost} اعتبار</small>`;
  const button=document.createElement("button");
  button.className="os-btn";
  button.textContent=level>=item.max?"حداکثر ارتقا":`ارتقا (${cost})`;
  button.disabled=level>=item.max||money<cost;
  button.addEventListener("click",()=>{
    if(level>=item.max||money<cost) return;
    money-=cost;
    player.upgrades[item.id]++;
    if(item.id==="health") {
      player.maxHealth+=20;
      player.health=Math.min(player.maxHealth,player.health+20);
    }
    openUpgrades();
    updateStatus();
  });
  card.appendChild(button);
  return card;
}

function openUpgrades() {
  if(!["playing","paused","upgrades"].includes(gameState)) return;
  gameState="upgrades";
  fireHeld=false;
  pauseBackgroundMusic();
  showPanel("مرکز ارتقای مهارت",`اعتبار شما: ${money} | هر مهارت چند سطح قابل ارتقا دارد.`,upgradeCatalog.map(makeUpgradeCard));
  $("os-resume").textContent="بازگشت به بازی";
}

function closeOverlay() {
  if(gameState==="shop"||gameState==="upgrades"||gameState==="paused") {
    gameState="playing";
    overlay.style.display="none";
    startBackgroundMusic();
    updateStatus();
  }
}

function togglePause() {
  if(gameState==="playing") {
    gameState="paused";
    pauseBackgroundMusic();
    fireHeld=false;
    showPanel("بازی متوقف شد","مأموریت فعلاً متوقف شده است.",[]);
    $("os-resume").textContent="ادامه مأموریت";
  } else if(gameState==="paused") {
    closeOverlay();
  }
}

// -------------------- STATUS & GAME OVER --------------------

function updateStatus() {
  moneyLabel.textContent=`اعتبار: ${money}`;
  weaponLabel.textContent=`سلاح: ${weapon.name}`;
  ammoLabel.textContent=reloadTimer>0?"در حال بارگذاری":`مهمات: ${ammo}/${weapon.magazine}`;
  waveLabel.textContent=`موج: ${wave}`;
}

function showGameOver() {
  fireHeld=false;
  const card=document.createElement("div");
  card.className="os-item";
  card.innerHTML=`<strong>گزارش مأموریت</strong><small>موج نهایی: ${wave}<br>دشمنان حذف‌شده: ${kills}<br>اعتبار باقی‌مانده: ${money}</small>`;
  const restart=document.createElement("button");
  restart.className="os-btn";
  restart.textContent="شروع دست جدید";
  restart.addEventListener("click",startGame);
  card.appendChild(restart);
  showPanel("MISSION FAILED","عملیات به پایان رسید. برای شروع دوباره آماده شو.",[card]);
  $("os-resume").textContent="بستن";
  $("os-resume").onclick=()=>{overlay.style.display="none";};
}

// -------------------- DRAW WORLD --------------------

function drawBackground() {
  const ground=ctx.createLinearGradient(0,0,0,GAME_HEIGHT);
  ground.addColorStop(0,"#424b3d"); ground.addColorStop(1,"#293329");
  ctx.fillStyle=ground; ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);

  for(let x=15;x<GAME_WIDTH;x+=65) for(let y=15;y<GAME_HEIGHT;y+=65) {
    const v=((x*7+y*13)%10)/100;
    ctx.fillStyle=`rgba(0,0,0,${v})`; ctx.fillRect(x,y,25,25);
  }
  ctx.strokeStyle="rgba(190,200,170,.055)"; ctx.lineWidth=1;
  for(let x=0;x<GAME_WIDTH;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,GAME_HEIGHT);ctx.stroke();}
  for(let y=0;y<GAME_HEIGHT;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(GAME_WIDTH,y);ctx.stroke();}

  ctx.fillStyle="#252b27"; ctx.fillRect(0,250,GAME_WIDTH,100);
  ctx.strokeStyle="#9a956b"; ctx.lineWidth=3; ctx.setLineDash([30,25]);
  ctx.beginPath();ctx.moveTo(0,300);ctx.lineTo(GAME_WIDTH,300);ctx.stroke();ctx.setLineDash([]);

  for(let i=0;i<35;i++){
    const x=(i*137+41)%GAME_WIDTH,y=(i*83+27)%GAME_HEIGHT;
    ctx.fillStyle="rgba(20,25,20,.35)";ctx.fillRect(x,y,5,3);
  }
  obstacles.forEach(drawObstacle);
  ctx.strokeStyle="#a1a58c";ctx.lineWidth=5;ctx.strokeRect(3,3,GAME_WIDTH-6,GAME_HEIGHT-6);
  ctx.fillStyle="#d4dac5";ctx.font="bold 15px Arial";
  ctx.fillText("SECTOR 04  /  ABANDONED MILITARY BASE",20,25);
}

function drawObstacle(o) {
  const {x,y,width:w,height:h,type}=o;
  ctx.fillStyle="rgba(0,0,0,.35)";ctx.fillRect(x+7,y+8,w,h);
  if(type==="building"){
    const g=ctx.createLinearGradient(x,y,x+w,y+h);
    g.addColorStop(0,"#555e50");g.addColorStop(1,"#303a32");
    ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
    ctx.fillStyle="#4b5548";ctx.fillRect(x+7,y+7,w-14,h-14);
    ctx.fillStyle="#323b32";ctx.fillRect(x+15,y+15,w-30,h-30);
    ctx.fillStyle="#1b2521";ctx.fillRect(x+25,y+25,35,25);ctx.fillRect(x+w-60,y+25,35,25);
    ctx.strokeStyle="#78816e";ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);
  } else if(type==="crate"){
    ctx.fillStyle="#493923";ctx.fillRect(x,y,w,h);
    ctx.fillStyle="#705633";ctx.fillRect(x+5,y+5,w-10,h-10);
    ctx.strokeStyle="#a18757";ctx.lineWidth=3;ctx.strokeRect(x,y,w,h);
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y+h);ctx.moveTo(x+w,y);ctx.lineTo(x,y+h);ctx.stroke();
  } else {
    ctx.fillStyle="#555c50";ctx.fillRect(x,y,w,h);
    ctx.fillStyle="#737b67";ctx.fillRect(x+3,y+3,w-6,5);
    ctx.strokeStyle="#a0a58b";ctx.strokeRect(x,y,w,h);
  }
}

function drawSoldier(x,y,angle,color,hitFlash,radius,isPlayer=false,type="grunt") {
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);
  ctx.fillStyle="rgba(0,0,0,.4)";ctx.beginPath();ctx.ellipse(3,6,radius+4,radius,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=isPlayer?"#28372b":"#302c28";
  ctx.fillRect(-radius*.55,6,radius*.42,11);ctx.fillRect(radius*.15,6,radius*.42,11);
  ctx.fillStyle=isPlayer?"#101512":"#242824";ctx.fillRect(-3,-radius-17,6,24);
  ctx.fillStyle=hitFlash>0?"#eee":color;
  ctx.beginPath();ctx.ellipse(0,0,radius*.86,radius*1.12,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=isPlayer?"#354532":"#49342d";ctx.fillRect(-radius*.65,-7,radius*1.3,14);
  ctx.fillStyle="#b69a78";ctx.beginPath();ctx.arc(0,-radius, radius*.52,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=isPlayer?"#303e2d":"#39312b";ctx.beginPath();ctx.arc(0,-radius-2,radius*.58,Math.PI,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  drawSoldier(player.x,player.y,player.angle,"#607653",0,player.radius,true);
}

function drawEnemy(e) {
  drawSoldier(e.x,e.y,Math.atan2(player.x-e.x,-(player.y-e.y)),e.color,e.hitFlash,e.radius,false,e.type);
  const pct=Math.max(0,e.health/e.maxHealth);
  const width=e.type==="boss"?70:36;
  ctx.fillStyle="#252525";ctx.fillRect(e.x-width/2,e.y-e.radius-25,width,5);
  ctx.fillStyle=e.type==="boss"?"#d84b43":"#d05245";ctx.fillRect(e.x-width/2,e.y-e.radius-25,width*pct,5);
  if(e.type==="boss"||e.type==="bomber"||e.type==="sniper"){
    ctx.fillStyle="#f0d9b0";ctx.font="bold 10px Arial";ctx.textAlign="center";
    ctx.fillText(enemyTypes[e.type].name,e.x,e.y-e.radius-30);ctx.textAlign="left";
  }
  if(e.type==="bomber"&&e.fuse>0){
    ctx.strokeStyle="#f0a04b";ctx.lineWidth=3;ctx.beginPath();
    ctx.arc(e.x,e.y,e.radius+7,0,Math.PI*2*(e.fuse/1100));ctx.stroke();
  }
}

function drawProjectiles() {
  bullets.forEach(b=>{
    ctx.strokeStyle="rgba(255,220,130,.45)";ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(b.previousX,b.previousY);ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fill();
  });
  enemyShots.forEach(b=>{
    ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,Math.PI*2);ctx.fill();
  });
}

function drawEffects() {
  particles.forEach(p=>{
    ctx.globalAlpha=Math.max(0,p.life/450);ctx.fillStyle=p.color;
    ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  floatingTexts.forEach(t=>{
    ctx.globalAlpha=Math.min(1,t.life/250);ctx.fillStyle=t.color;
    ctx.font="bold 15px Arial";ctx.textAlign="center";ctx.fillText(t.text,t.x,t.y);
  });
  ctx.globalAlpha=1;ctx.textAlign="left";
}

function drawLighting() {
  const g=ctx.createRadialGradient(player.x,player.y,80,player.x,player.y,430);
  g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.35)");
  ctx.fillStyle=g;ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
}

function drawHUD() {
  ctx.fillStyle="rgba(12,18,15,.9)";ctx.fillRect(15,40,245,112);
  ctx.strokeStyle="#697963";ctx.strokeRect(15,40,245,112);
  ctx.fillStyle="#d9e0cd";ctx.font="bold 15px Arial";ctx.fillText("OPERATOR STATUS",30,63);
  ctx.fillStyle="#252c25";ctx.fillRect(30,77,210,16);
  ctx.fillStyle=player.health>30?"#80a65c":"#c84b40";
  ctx.fillRect(30,77,210*(player.health/player.maxHealth),16);
  ctx.strokeStyle="#a2ac91";ctx.strokeRect(30,77,210,16);
  ctx.fillStyle="#fff";ctx.font="12px Arial";ctx.fillText(`HP: ${Math.ceil(player.health)} / ${player.maxHealth}`,30,113);
  ctx.font="bold 15px Arial";ctx.fillText(`CREDITS: ${money}`,30,138);

  ctx.fillStyle="rgba(12,18,15,.9)";ctx.fillRect(805,40,175,75);
  ctx.strokeStyle="#697963";ctx.strokeRect(805,40,175,75);
  ctx.fillStyle="#d9e0cd";ctx.font="bold 21px Arial";ctx.fillText(`WAVE ${wave}`,825,70);
  ctx.font="13px Arial";ctx.fillText(`HOSTILES: ${enemies.length+enemiesToSpawn}`,825,95);

  ctx.fillStyle="rgba(12,18,15,.85)";ctx.fillRect(15,560,970,25);
  ctx.fillStyle="#9ca993";ctx.font="12px Arial";ctx.fillText("OPERATION STRIKE  |  SECTOR 04",30,577);
  ctx.textAlign="right";ctx.fillText(`WEAPON: ${weapon.name.toUpperCase()}`,970,577);ctx.textAlign="left";
}

function drawMenu() {
  ctx.fillStyle="rgba(0,0,0,.84)";ctx.fillRect(0,0,GAME_WIDTH,GAME_HEIGHT);
  ctx.textAlign="center";ctx.fillStyle="#c7d4b2";ctx.font="bold 55px Arial";
  ctx.fillText("OPERATION: STRIKE",500,190);
  ctx.fillStyle="#89977e";ctx.font="19px Arial";ctx.fillText("ABANDONED MILITARY BASE",500,230);
  ctx.fillStyle="#fff";ctx.font="bold 26px Arial";ctx.fillText("CLICK OR TAP TO START",500,335);
  ctx.fillStyle="#b8c2ad";ctx.font="17px Arial";
  ctx.fillText("W A S D  -  MOVE",500,400);
  ctx.fillText("MOUSE / RIGHT STICK  -  AIM",500,430);
  ctx.fillText("CLICK / FIRE BUTTON  -  SHOOT",500,460);
  ctx.textAlign="left";
}

function draw() {
  ctx.clearRect(0,0,GAME_WIDTH,GAME_HEIGHT);
  ctx.save();
  if(screenShake>0)ctx.translate((Math.random()-.5)*screenShake,(Math.random()-.5)*screenShake);
  drawBackground();
  drawEffects();
  enemies.forEach(drawEnemy);
  drawProjectiles();
  drawPlayer();
  drawLighting();
  ctx.restore();
  if(gameState!=="menu")drawHUD();
  if(gameState==="menu")drawMenu();
}

// -------------------- UPDATE LOOP --------------------

function update(dt) {
  if(gameState!=="playing")return;
  updatePlayer(dt);
  updateReload(dt);
  updateBullets(dt);
  updateEnemies(dt);
  checkBulletCollisions();
  updateEffects(dt);
  screenShake=Math.max(0,screenShake-dt*.025);
  updateStatus();
}

function gameLoop(timestamp) {
  const dt=lastTime===0?16.67:Math.min(timestamp-lastTime,50);
  lastTime=timestamp;
  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

// -------------------- START --------------------

updateStatus();
requestAnimationFrame(gameLoop);
