// ============================================
// Minimal Endless Runner - Complete Edition
// ============================================

// Constants
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const GROUND_Y = 480;
const PLAYER_X = 100;

// Physics
const GRAVITY_UP = 0.5;
const GRAVITY_DOWN = 0.9;
const JUMP_FORCE = -13;
const JUMP_FORCE_SECOND = -10;

// Speed
const START_SPEED = 3.5;
const BASE_SPEED = 5;
const MAX_SPEED = 16;

// Timing
const COYOTE_TIME = 6; // ~100ms at 60fps
const INPUT_BUFFER = 7; // ~120ms at 60fps
const HIT_STOP = 3; // ~50ms
const SLOW_MO_DURATION = 18; // ~300ms
const PERFECT_JUMP_MIN = 20;  // 完美跳跃最小距离（像素）
const PERFECT_JUMP_MAX = 40;  // 完美跳跃最大距离（像素）

// Difficulty Phases
const PHASES = [
  { maxScore: 200, speedMult: 0.6, interval: 140, patterns: [['low']] },
  { maxScore: 500, speedMult: 0.85, interval: 110, patterns: [['low'], ['low', 'low'], ['air']] },
  { maxScore: 800, speedMult: 1.1, interval: 90, patterns: [['low'], ['air'], ['low', 'air'], ['air', 'low']] },
  { maxScore: Infinity, speedMult: 1.3, interval: 75, patterns: [['low'], ['air'], ['low', 'air'], ['air', 'low'], ['low', 'low']] }
];

// Utility
function easeOutQuad(t) { return 1 - (1 - t) * (1 - t); }
function easeInQuad(t) { return t * t; }
function lerp(a, b, t) { return a + (b - a) * t; }

// ============================================
// Audio System
// ============================================
class AudioSystem {
  constructor() {
    this.ctx = null;
    this.speedPitch = 1;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, duration, vol = 0.3) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq * this.speedPitch;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() { this.playTone(440, 0.1); }
  playDoubleJump() { this.playTone(660, 0.12); }
  playHit() { this.playTone(150, 0.3, 0.5); }
}

// ============================================
// Particle System (Object Pool)
// ============================================
class Particle {
  constructor() { this.active = false; }
  
  spawn(x, y, vx, vy, life, size) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.size = size;
    this.active = true;
  }
  
  update(timeScale) {
    if (!this.active) return;
    this.x += this.vx * timeScale;
    this.y += this.vy * timeScale;
    this.vy += 0.2 * timeScale;
    this.life -= timeScale;
    if (this.life <= 0) this.active = false;
  }
  
  draw(ctx) {
    if (!this.active) return;
    const alpha = this.life / this.maxLife;
    ctx.fillStyle = `rgba(200,200,200,${alpha * 0.6})`;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

class ParticleSystem {
  constructor(count = 100) {
    this.particles = Array.from({ length: count }, () => new Particle());
  }
  
  spawn(x, y, vx, vy, life, size) {
    const p = this.particles.find(p => !p.active);
    if (p) p.spawn(x, y, vx, vy, life, size);
  }
  
  spawnDust(x, y) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5);
      const speed = 1 + Math.random() * 2;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 20 + Math.random() * 10, 2);
    }
  }
  
  spawnExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 40 + Math.random() * 20, 3);
    }
  }
  
  spawnPerfectExplosion(x, y) {
    // 轻微强化粒子效果 - 比普通跳跃稍强但不夸张
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, vx, vy, 40 + Math.random() * 20, 3);
    }
  }
  
  update(timeScale) {
    this.particles.forEach(p => p.update(timeScale));
  }
  
  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
  
  clear() {
    this.particles.forEach(p => p.active = false);
  }
}

// ============================================
// Trail System
// ============================================
class TrailSystem {
  constructor(length = 12) {
    this.history = [];
    this.maxLength = length;
  }
  
  update(x, y) {
    this.history.push({ x, y });
    if (this.history.length > this.maxLength) {
      this.history.shift();
    }
  }
  
  draw(ctx, speed, isJumping) {
    if (this.history.length < 2) return;
    
    const speedFactor = Math.min(speed / MAX_SPEED, 1);
    const effectiveLength = Math.floor(this.history.length * (0.4 + speedFactor * 0.6));
    const baseOffset = 6 + speedFactor * 10;
    const jumpBoost = isJumping ? 1.2 : 1;
    
    const startIdx = Math.max(0, this.history.length - effectiveLength);
    
    for (let i = startIdx; i < this.history.length; i++) {
      const point = this.history[i];
      const reverseIndex = effectiveLength - (i - startIdx);
      const offsetX = speed * baseOffset * 0.12 * reverseIndex * jumpBoost;
      const normalizedIndex = reverseIndex / effectiveLength;
      const alpha = Math.pow(normalizedIndex, 2) * 0.35 * (0.5 + speedFactor * 0.5);
      
      if (alpha < 0.02) continue;
      
      ctx.fillStyle = `rgba(150,150,150,${alpha})`;
      ctx.fillRect(point.x - offsetX, point.y, 32, 52);
    }
  }
  
  clear() {
    this.history = [];
  }
}

// ============================================
// Player
// ============================================
class Player {
  constructor(game) {
    this.game = game;
    this.width = 36;
    this.height = 60;
    this.normalHeight = 60;
    this.slideHeight = 30;
    this.x = PLAYER_X;
    this.y = GROUND_Y - this.height;
    this.vy = 0;
    
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 45;
    
    this.jumpCount = 0;
    this.canCoyote = false;
    this.coyoteTimer = 0;
    this.bufferTimer = 0;
    
    this.trail = new TrailSystem();
  }
  
  jump() {
    const canJump = this.isGrounded || this.canCoyote || this.jumpCount < 2;
    
    if (canJump) {
      // 起跳瞬间检测完美跳跃 - 检查前方障碍物
      this.checkPerfectJumpTiming();
      
      // Second jump is weaker
      const force = this.jumpCount === 0 ? JUMP_FORCE : JUMP_FORCE_SECOND;
      this.vy = force;
      this.isGrounded = false;
      this.canCoyote = false;
      this.jumpCount++;
      
      // Cancel slide on jump
      if (this.isSliding) {
        this.isSliding = false;
        this.height = this.normalHeight;
      }
      
      this.game.audio.playJump();
      this.game.particles.spawnDust(this.x + this.width / 2, this.y + this.height);
      return true;
    }
    return false;
  }
  
  checkPerfectJumpTiming() {
    // 获取所有障碍物
    const obstacles = this.game.obstacles.obstacles;
    const playerRight = this.x + this.width;
    
    // 找到前方最近的障碍物（在玩家右侧的）
    let nearestObs = null;
    let minDistance = Infinity;
    
    for (const obs of obstacles) {
      const obsLeft = obs.x;
      const distance = obsLeft - playerRight;
      
      // 只考虑在前方的障碍物（距离为正）
      if (distance > 0 && distance < minDistance) {
        minDistance = distance;
        nearestObs = obs;
      }
    }
    
    // 如果最近障碍物在完美窗口范围内（20-40像素），触发完美跳跃
    if (nearestObs && minDistance > PERFECT_JUMP_MIN && minDistance < PERFECT_JUMP_MAX) {
      this.game.triggerPerfectJump();
    }
  }
  
  bufferJump() {
    this.bufferTimer = INPUT_BUFFER;
  }
  
  startSlide() {
    if (this.isGrounded && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      this.height = this.slideHeight;
      this.y = GROUND_Y - this.height;
    }
  }
  
  stopSlide() {
    this.isSliding = false;
    this.height = this.normalHeight;
    this.y = GROUND_Y - this.height;
  }
  
  update(input, timeScale) {
    // Handle slide timer
    if (this.isSliding) {
      this.slideTimer -= timeScale;
      if (this.slideTimer <= 0) this.stopSlide();
    }
    
    // Apply gravity (asymmetric)
    const gravity = this.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN;
    this.vy += gravity * timeScale;
    this.y += this.vy * timeScale;
    
    // Ground collision
    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
      
      // Try buffered jump
      if (this.bufferTimer > 0) {
        this.jump();
        this.bufferTimer = 0;
      }
    } else {
      // Left ground - start coyote time
      if (this.isGrounded) {
        this.isGrounded = false;
        this.canCoyote = true;
        this.coyoteTimer = COYOTE_TIME;
      }
    }
    
    // Update coyote timer
    if (this.canCoyote) {
      this.coyoteTimer -= timeScale;
      if (this.coyoteTimer <= 0) {
        this.canCoyote = false;
        if (this.jumpCount === 0) this.jumpCount = 1;
      }
    }
    
    // Update buffer timer
    if (this.bufferTimer > 0) {
      this.bufferTimer -= timeScale;
      if (this.bufferTimer <= 0) this.bufferTimer = 0;
    }
    
    // Handle input
    if (input.jumpPressed) {
      if (!this.jump()) {
        this.bufferJump();
      }
      input.jumpPressed = false;
    }
    
    if (input.slidePressed && !this.isSliding) {
      this.startSlide();
    } else if (!input.slidePressed && this.isSliding) {
      this.stopSlide();
    }
    
    // Update trail
    this.trail.update(this.x, this.y);
  }
  
  draw(ctx) {
    // Draw trail
    this.trail.draw(ctx, this.game.currentSpeed, !this.isGrounded);
    
    // Draw player (minimalist style)
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Inner detail
    ctx.fillStyle = '#888';
    ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
    
    // Slide indicator
    if (this.isSliding) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x - 6, this.y, 4, this.height);
    }
  }
  
  getBounds() {
    return {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width - 8,
      height: this.height - 8
    };
  }
  
  reset() {
    this.y = GROUND_Y - this.normalHeight;
    this.vy = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.height = this.normalHeight;
    this.jumpCount = 0;
    this.trail.clear();
  }
}

// ============================================
// Obstacle
// ============================================
class Obstacle {
  constructor(type, x) {
    this.type = type;
    this.x = x;
    this.passed = false;
    
    if (type === 'low') {
      this.width = 30;
      this.height = 40;
      this.y = GROUND_Y - this.height;
    } else {
      this.width = 40;
      this.height = 35;
      this.y = GROUND_Y - 80;
    }
  }
  
  update(speed, timeScale) {
    this.x -= speed * timeScale;
  }
  
  draw(ctx) {
    ctx.fillStyle = '#666';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.fillStyle = '#444';
    const pad = 3;
    ctx.fillRect(this.x + pad, this.y + pad, this.width - pad * 2, this.height - pad * 2);
  }
  
  getBounds() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4
    };
  }
}

// ============================================
// Obstacle Manager (Pattern-based)
// ============================================
class ObstacleManager {
  constructor(game) {
    this.game = game;
    this.obstacles = [];
    this.spawnTimer = 0;
    this.currentPattern = null;
    this.patternIndex = 0;
    this.reactionTime = 0.5;
  }
  
  getCurrentPhase() {
    const score = this.game.score;
    for (const phase of PHASES) {
      if (score < phase.maxScore) return phase;
    }
    return PHASES[PHASES.length - 1];
  }
  
  getSpawnInterval() {
    const phase = this.getCurrentPhase();
    return phase.interval + (Math.random() - 0.5) * 20;
  }
  
  getMinDistance() {
    return this.game.currentSpeed * this.reactionTime * 60;
  }
  
  update(timeScale) {
    const phase = this.getCurrentPhase();
    
    // Continue current pattern
    if (this.currentPattern && this.patternIndex < this.currentPattern.length) {
      const lastObstacle = this.obstacles[this.obstacles.length - 1];
      const minSpacing = this.getMinDistance() * 0.6;
      
      if (!lastObstacle || (CANVAS_WIDTH + 50 - lastObstacle.x >= minSpacing)) {
        const type = this.currentPattern[this.patternIndex];
        this.obstacles.push(new Obstacle(type, CANVAS_WIDTH + 50));
        this.patternIndex++;
      }
    } else if (this.spawnTimer <= 0) {
      // Start new pattern
      const patterns = phase.patterns;
      this.currentPattern = patterns[Math.floor(Math.random() * patterns.length)];
      this.patternIndex = 0;
      this.spawnTimer = this.getSpawnInterval();
    }
    
    this.spawnTimer -= timeScale;
    
    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.update(this.game.currentSpeed, timeScale);
      
      if (obs.x + obs.width < 0) {
        this.obstacles.splice(i, 1);
      }
    }
  }
  
  draw(ctx) {
    this.obstacles.forEach(obs => obs.draw(ctx));
  }
  
  reset() {
    this.obstacles = [];
    this.spawnTimer = 0;
    this.currentPattern = null;
    this.patternIndex = 0;
  }
}

// ============================================
// Game
// ============================================
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set actual canvas size to match DPR for sharp rendering
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    
    // Scale canvas via CSS to display size
    canvas.style.width = CANVAS_WIDTH + 'px';
    canvas.style.height = CANVAS_HEIGHT + 'px';
    
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    
    // Improve text rendering
    this.ctx.textRendering = 'geometricPrecision';
    this.ctx.imageSmoothingEnabled = false;
    
    this.state = 'start'; // start, running, gameover
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.currentSpeed = START_SPEED;
    this.targetSpeed = START_SPEED;
    
    this.audio = new AudioSystem();
    this.particles = new ParticleSystem();
    this.player = new Player(this);
    this.obstacles = new ObstacleManager(this);
    
    this.input = { jumpPressed: false, slidePressed: false };
    
    this.hitStopTimer = 0;
    this.slowMoTimer = 0;
    this.perfectJumpTimer = 0; // 完美跳跃显示计时器
    this.lastPerfectJump = false; // 上一次跳跃是否为完美跳跃
    
    this.bindInput();
    this.loop = this.loop.bind(this);
  }
  
  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.input.jumpPressed = true;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.input.slidePressed = true;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.input.jumpPressed = false;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.input.slidePressed = false;
      }
    });
    
    this.canvas.addEventListener('mousedown', () => {
      this.input.jumpPressed = true;
      setTimeout(() => this.input.jumpPressed = false, 100);
    });
  }
  
  start() {
    this.audio.init();
    this.state = 'running';
    this.score = 0;
    this.currentSpeed = START_SPEED;
    this.player.reset();
    this.obstacles.reset();
    this.particles.clear();
  }
  
  gameOver() {
    this.state = 'gameover';
    this.audio.playHit();
    this.particles.spawnExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    // Save high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore(this.score);
    }
  }
  
  getTimeScale() {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer--;
      return 0;
    }
    if (this.slowMoTimer > 0) {
      this.slowMoTimer--;
      return 0.3;
    }
    return 1;
  }
  
  triggerHit() {
    this.hitStopTimer = HIT_STOP;
    this.slowMoTimer = SLOW_MO_DURATION;
  }
  
  triggerPerfectJump() {
    // 奖励分数
    this.score += 50;
    this.perfectJumpTimer = 60; // 显示1秒
    // 增强粒子效果
    this.particles.spawnPerfectExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
  }
  
  loadHighScore() {
    try {
      const saved = localStorage.getItem('runnerHighScore');
      return saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  }
  
  saveHighScore(score) {
    try {
      localStorage.setItem('runnerHighScore', Math.floor(score).toString());
    } catch (e) {
      // Ignore storage errors
    }
  }
  
  update() {
    const timeScale = this.getTimeScale();
    
    // 更新完美跳跃显示计时器
    if (this.perfectJumpTimer > 0) {
      this.perfectJumpTimer -= timeScale;
    }
    
    if (this.state === 'running') {
      // Calculate target speed based on phase
      const phase = this.obstacles.getCurrentPhase();
      const targetMult = phase.speedMult;
      
      // Smooth speed transition
      this.targetSpeed = lerp(BASE_SPEED * 0.6, BASE_SPEED * targetMult, 
        easeOutQuad(Math.min(this.score / 500, 1)));
      this.currentSpeed = lerp(this.currentSpeed, this.targetSpeed, 0.02);
      
      // Update audio pitch
      this.audio.speedPitch = 0.9 + (this.currentSpeed / MAX_SPEED) * 0.3;
      
      // Update score
      this.score += this.currentSpeed * 0.1;
      
      // Update entities
      this.player.update(this.input, timeScale);
      this.obstacles.update(timeScale);
      this.particles.update(timeScale);
      
      // Check collisions & perfect jumps
      const playerBounds = this.player.getBounds();
      for (const obs of this.obstacles.obstacles) {
        const obsBounds = obs.getBounds();
        
        // 检查碰撞
        if (
          playerBounds.x < obsBounds.x + obsBounds.width &&
          playerBounds.x + playerBounds.width > obsBounds.x &&
          playerBounds.y < obsBounds.y + obsBounds.height &&
          playerBounds.y + playerBounds.height > obsBounds.y
        ) {
          this.triggerHit();
          this.gameOver();
        }
      }
    }
    
    // Handle input for state changes
    if (this.input.jumpPressed) {
      if (this.state === 'start' || this.state === 'gameover') {
        this.start();
      }
      this.input.jumpPressed = false;
    }
  }
  
  draw() {
    // Clear
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw ground
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);
    
    // Draw entities
    this.player.draw(this.ctx);
    this.obstacles.draw(this.ctx);
    this.particles.draw(this.ctx);
    
    // Draw UI
    this.drawUI();
  }
  
  drawUI() {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(Math.floor(this.score), CANVAS_WIDTH - 30, 40);
    
    // High score
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = '#888';
    this.ctx.fillText(`HI: ${Math.floor(this.highScore)}`, CANVAS_WIDTH - 30, 65);
    
    // 完美跳跃提示 - 显示在玩家头顶
    if (this.perfectJumpTimer > 0) {
      const alpha = Math.min(1, this.perfectJumpTimer / 20);
      this.ctx.save();
      this.ctx.translate(this.player.x + this.player.width / 2, this.player.y - 25);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PERFECT!', 0, 0);
      this.ctx.restore();
    }
    
    if (this.state === 'start') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('RUNNER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('SPACE: Jump (Double Jump) | DOWN: Slide', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      this.ctx.fillText('Press SPACE to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    } else if (this.state === 'gameover') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      const s = Math.floor(this.score);
      let rating = 'Needs Improvement';
      if (s >= 1000) rating = 'Elite';
      else if (s >= 500) rating = 'Strong';
      else if (s >= 200) rating = 'Decent';
      
      this.ctx.font = '24px "Courier New", monospace';
      this.ctx.fillText(`Score: ${s}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      this.ctx.fillText(rating, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('Press SPACE to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    }
  }
  
  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  }
}

// ============================================
// Initialize
// ============================================
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.loop();
