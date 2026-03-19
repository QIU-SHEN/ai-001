// ============================================
// Game
// ============================================
import { 
  START_SPEED, BASE_SPEED, MAX_SPEED,
  lerp, easeOutQuad,
  SLIDE_BOOST_MIN, SLIDE_BOOST_MAX, COMBO_THRESHOLD, COMBO_IMMUNITY
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
    
    // Combo 系统
    this.comboCount = 0; // 连续躲避计数
    this.comboTier = 0; // Combo 等级（每10次增加1）
    this.immunityCount = 0; // 剩余免疫次数
    this.lastObstaclePassed = null; // 上一次通过的障碍
    
    // 屏幕震动
    this.shakeTimer = 0; // 震动计时器
    this.shakeIntensity = 0; // 震动强度
    
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
    
    // 重置 combo 系统
    this.comboCount = 0;
    this.comboTier = 0;
    this.immunityCount = 0;
    this.lastObstaclePassed = null;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
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
    // Near Miss 慢动作效果
    this.time.triggerNearMiss();
    // 增强粒子效果
    this.particles.spawnPerfectExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    // 增加 combo 计数
    this.comboCount++;
    this.checkComboReward();
  }
  
  checkComboReward() {
    const newTier = Math.floor(this.comboCount / COMBO_THRESHOLD);
    if (newTier > this.comboTier) {
      // 升级奖励
      this.comboTier = newTier;
      this.immunityCount += COMBO_IMMUNITY;
      // 增强粒子效果
      this.particles.spawnComboExplosion(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.comboTier
      );
    }
  }
  
  // 获取滑行时的速度加成
  getSlideBoost() {
    if (!this.player.isSliding) return 1;
    // 根据 combo 等级增加速度
    const boost = SLIDE_BOOST_MIN + (this.comboTier * 0.01);
    return Math.min(boost, SLIDE_BOOST_MAX);
  }
  
  // 触发屏幕震动
  triggerShake(intensity) {
    this.shakeIntensity = intensity;
    this.shakeTimer = 10; // 约0.17秒
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
    
    // 更新屏幕震动
    if (this.shakeTimer > 0) {
      this.shakeTimer -= timeScale;
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
        
        // 标记已通过的障碍
        if (obs.x + obs.width < this.player.x && !obs.passed) {
          obs.passed = true;
        }
        
        // 检查碰撞
        if (
          playerBounds.x < obsBounds.x + obsBounds.width &&
          playerBounds.x + playerBounds.width > obsBounds.x &&
          playerBounds.y < obsBounds.y + obsBounds.height &&
          playerBounds.y + playerBounds.height > obsBounds.y
        ) {
          // 有免疫次数时抵消一次碰撞
          if (this.immunityCount > 0) {
            this.immunityCount--;
            this.particles.spawnShieldBreak(
              this.player.x + this.player.width / 2,
              this.player.y + this.player.height / 2
            );
            // 销毁该障碍，继续游戏
            obs.x = -1000;
            continue;
          }
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
    // 计算屏幕震动偏移
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }
    
    // Clear
    this.renderer.clear();
    
    // 应用屏幕震动
    this.renderer.ctx.save();
    this.renderer.ctx.translate(shakeX, shakeY);
    
    // Draw ground
    this.renderer.drawGround();
    
    // Draw entities
    this.player.draw(this.renderer.ctx);
    this.obstacles.draw(this.renderer.ctx);
    this.particles.draw(this.renderer.ctx);
    
    // 恢复屏幕震动
    this.renderer.ctx.restore();
    
    // Draw UI (UI不受震动影响)
    this.renderer.drawUI(this);
  }
  
  loop(timestamp) {
    this.time.update(timestamp);
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  }
}
