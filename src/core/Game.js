// ============================================
// Game
// ============================================
import { 
  START_SPEED, BASE_SPEED, MAX_SPEED,
  lerp, easeOutQuad
} from './Constants.js';
import { Input } from './Input.js';
import { Time } from './Time.js';
import { SoundSystem } from '../systems/SoundSystem.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { Player } from '../entities/Player.js';
import { ObstacleManager } from '../systems/ObstacleManager.js';
import { Renderer } from '../render/Renderer.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.time = new Time();
    
    this.state = 'start'; // start, running, gameover
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.currentSpeed = START_SPEED;
    this.targetSpeed = START_SPEED;
    
    this.audio = new SoundSystem();
    this.particles = new ParticleSystem();
    this.player = new Player(this);
    this.obstacles = new ObstacleManager(this);
    
    this.perfectJumpTimer = 0; // 完美跳跃显示计时器
    this.lastPerfectJump = false; // 上一次跳跃是否为完美跳跃
    
    this.loop = this.loop.bind(this);
  }
  
  start() {
    this.audio.init();
    this.state = 'running';
    this.score = 0;
    this.currentSpeed = START_SPEED;
    this.player.reset();
    this.obstacles.reset();
    this.particles.clear();
    this.time.reset();
    this.input.reset();
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
    return this.time.getTimeScale();
  }
  
  triggerHit() {
    this.time.triggerHit();
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
    this.renderer.clear();
    
    // Draw ground
    this.renderer.drawGround();
    
    // Draw entities
    this.player.draw(this.renderer.ctx);
    this.obstacles.draw(this.renderer.ctx);
    this.particles.draw(this.renderer.ctx);
    
    // Draw UI
    this.renderer.drawUI(this);
  }
  
  loop(timestamp) {
    this.time.update(timestamp);
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  }
}
