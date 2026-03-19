// ============================================
// Game - UGC 关卡系统重构版
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
import { Obstacle } from '../entities/Obstacle.js';
import { Renderer } from '../render/Renderer.js';
import { createEmptyLevel, validateLevel, importLevel, exportLevel, OBSTACLE_TYPES } from './Level.js';
import { ObstacleFactory } from '../entities/ObstacleFactory.js';
import { Editor } from '../editor/Editor.js';

// 游戏模式
export const GAME_MODE = {
  ENDLESS: 'endless',
  LEVEL: 'level',
  EDITOR: 'editor'
};

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.time = new Time();
    
    this.state = 'start'; // start, running, gameover, win
    this.score = 0;
    this.highScore = this.loadHighScore();
    this.currentSpeed = START_SPEED;
    
    this.audio = new SoundSystem();
    this.particles = new ParticleSystem();
    this.player = new Player(this);
    this.obstacles = new ObstacleManager(this);
    
    // ===== 关卡系统（重构）=====
    this.mode = GAME_MODE.ENDLESS;
    this.currentLevel = null;      // 当前关卡数据
    this.levelTime = 0;            // 关卡内时间（毫秒）
    this.timelineIndex = 0;        // 时间轴索引
    
    // Combo 系统
    this.comboCount = 0;
    this.comboTier = 0;
    this.immunityCount = 0;
    this.perfectJumpTimer = 0;
    
    // 屏幕震动
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    
    // 录制模式
    this.isRecording = false;
    this.recordStartTime = 0;
    this.recordedData = [];
    
    // 完整编辑器
    this.editor = null; // 延迟初始化
    this.showEditorUI = false;
    
    this.loop = this.loop.bind(this);
  }
  
  // ========== 关卡接口（文档要求）==========
  
  loadLevel(levelData) {
    // 验证关卡数据
    const validation = validateLevel(levelData);
    if (!validation.valid) {
      console.error('Invalid level:', validation.error);
      return false;
    }
    
    this.currentLevel = levelData;
    this.mode = GAME_MODE.LEVEL;
    return true;
  }
  
  startLevel() {
    if (!this.currentLevel && this.mode !== GAME_MODE.ENDLESS) {
      console.error('No level loaded');
      return false;
    }
    
    this.resetLevel();
    this.state = 'running';
    return true;
  }
  
  resetLevel() {
    // 重置时间
    this.levelTime = 0;
    this.timelineIndex = 0;
    
    // 应用关卡配置
    if (this.currentLevel && this.currentLevel.config) {
      this.currentSpeed = this.currentLevel.config.baseSpeed || BASE_SPEED;
    } else {
      this.currentSpeed = START_SPEED;
    }
    
    // 重置实体
    this.player.reset();
    this.obstacles.reset();
    this.particles.clear();
    this.time.reset();
    this.input.reset();
    
    // 重置 combo 系统
    this.comboCount = 0;
    this.comboTier = 0;
    this.immunityCount = 0;
    this.perfectJumpTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.score = 0;
    
    // 录制模式重置
    this.recordedData = [];
    this.recordStartTime = performance.now();
  }
  
  stopLevel() {
    this.state = 'start';
  }
  
  // ========== 旧接口兼容 ==========
  
  start() {
    this.audio.init();
    this.startLevel();
  }
  
  // ========== 游戏流程 ==========
  
  gameOver() {
    this.state = 'gameover';
    this.audio.playHit();
    this.particles.spawnExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    // 无尽模式保存高分
    if (this.mode === GAME_MODE.ENDLESS && this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore(this.score);
    }
  }
  
  levelComplete() {
    this.state = 'win';
    this.particles.spawnComboExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      3
    );
  }
  
  // ========== Timeline 驱动生成 ==========
  
  processTimeline(deltaTime) {
    if (this.mode === GAME_MODE.ENDLESS) return; // 无尽模式不使用 timeline
    if (this.mode === GAME_MODE.EDITOR) return; // 录制模式不检查胜利
    if (!this.currentLevel) return;
    
    const timeline = this.currentLevel.timeline;
    
    // 按时间顺序生成障碍
    while (this.timelineIndex < timeline.length) {
      const item = timeline[this.timelineIndex];
      if (item.time <= this.levelTime) {
        // 使用工厂创建障碍
        const spawnX = this.player.x + 500 + (item.xOffset || 0);
        const obstacle = ObstacleFactory.create({
          type: item.type,
          spawnX: spawnX,
          xOffset: item.xOffset || 0
        });
        
        if (obstacle) {
          this.obstacles.obstacles.push(obstacle);
        }
        
        this.timelineIndex++;
      } else {
        break;
      }
    }
    
    // 检查关卡完成
    if (this.timelineIndex >= timeline.length) {
      // 所有障碍已生成，检查是否全部通过
      const activeObstacles = this.obstacles.obstacles.filter(o => o.x + o.width > 0).length;
      if (activeObstacles === 0) {
        this.levelComplete();
      }
    }
  }
  
  // ========== 录制功能 ==========
  
  startRecording() {
    this.isRecording = true;
    this.recordedData = [];
    this.recordStartTime = performance.now();
    this.mode = GAME_MODE.EDITOR;
    this.currentLevel = createEmptyLevel('录制关卡', 'player');
    console.log('[录制] 开始，按 1 放置 low，按 2 放置 air，R 清空，P 导出');
  }
  
  recordObstacle(type) {
    if (!this.isRecording) return;
    
    const time = Math.floor(performance.now() - this.recordStartTime);
    const record = { time, type, xOffset: 0 };
    this.recordedData.push(record);
    
    // 即时生成障碍测试
    const obstacle = ObstacleFactory.create({
      type,
      spawnX: this.player.x + 500,
      xOffset: 0
    });
    if (obstacle) {
      this.obstacles.obstacles.push(obstacle);
    }
    
    console.log(`[录制] ${type} @ ${time}ms`);
  }
  
  clearRecording() {
    this.recordedData = [];
    this.recordStartTime = performance.now();
    this.obstacles.reset();
    console.log('[录制] 已清空');
  }
  
  exportLevel() {
    // 构建完整 Level JSON
    const level = {
      meta: {
        name: '录制关卡',
        author: 'player',
        version: 1
      },
      config: {
        baseSpeed: 6,
        gravity: 1.2,
        spawnOffset: 300
      },
      timeline: [...this.recordedData].sort((a, b) => a.time - b.time)
    };
    
    const json = exportLevel(level);
    console.log('[录制] 关卡数据（已复制到剪贴板）：');
    console.log(json);
    
    // 尝试复制到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json);
    }
    
    return json;
  }
  
  // ========== 游戏逻辑 ==========
  
  getTimeScale() {
    return this.time.getTimeScale();
  }
  
  triggerHit() {
    this.time.triggerHit();
  }
  
  triggerPerfectJump() {
    this.score += 50;
    this.perfectJumpTimer = 60;
    this.time.triggerNearMiss();
    this.particles.spawnPerfectExplosion(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2
    );
    this.comboCount++;
    this.checkComboReward();
  }
  
  checkComboReward() {
    const newTier = Math.floor(this.comboCount / COMBO_THRESHOLD);
    if (newTier > this.comboTier) {
      this.comboTier = newTier;
      this.immunityCount += COMBO_IMMUNITY;
      this.particles.spawnComboExplosion(
        this.player.x + this.player.width / 2,
        this.player.y + this.player.height / 2,
        this.comboTier
      );
    }
  }
  
  getSlideBoost() {
    if (!this.player.isSliding) return 1;
    const boost = SLIDE_BOOST_MIN + (this.comboTier * 0.01);
    return Math.min(boost, SLIDE_BOOST_MAX);
  }
  
  triggerShake(intensity) {
    this.shakeIntensity = intensity;
    this.shakeTimer = 10;
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
    } catch (e) {}
  }
  
  // ========== 主循环 ==========
  
  update() {
    const timeScale = this.getTimeScale();
    const deltaTime = this.time.deltaTime || 16.67;
    
    // 更新计时器
    if (this.perfectJumpTimer > 0) {
      this.perfectJumpTimer -= timeScale;
    }
    if (this.shakeTimer > 0) {
      this.shakeTimer -= timeScale;
    }
    
    // 录制模式输入处理
    if (this.isRecording) {
      if (this.input.editorPlaceLow) {
        this.recordObstacle('low');
        this.input.editorPlaceLow = false;
      }
      if (this.input.editorPlaceAir) {
        this.recordObstacle('air');
        this.input.editorPlaceAir = false;
      }
      if (this.input.editorClear) {
        this.clearRecording();
        this.input.editorClear = false;
      }
      if (this.input.editorExport) {
        this.exportLevel();
        this.input.editorExport = false;
      }
    }
    
    if (this.state === 'running') {
      // 更新关卡时间
      this.levelTime += deltaTime * timeScale;
      
      // Timeline 驱动生成
      this.processTimeline(deltaTime * timeScale);
      
      // 无尽模式：原逻辑
      if (this.mode === GAME_MODE.ENDLESS) {
        const phase = this.obstacles.getCurrentPhase();
        const targetMult = phase.speedMult;
        const targetSpeed = lerp(BASE_SPEED * 0.6, BASE_SPEED * targetMult, 
          easeOutQuad(Math.min(this.score / 500, 1)));
        this.currentSpeed = lerp(this.currentSpeed, targetSpeed, 0.02);
        this.score += this.currentSpeed * 0.1;
      }
      
      // 更新音频音调
      this.audio.speedPitch = 0.9 + (this.currentSpeed / MAX_SPEED) * 0.3;
      
      // 更新实体
      this.player.update(this.input, timeScale);
      this.obstacles.update(timeScale);
      this.particles.update(timeScale);
      
      // 碰撞检测
      const playerBounds = this.player.getBounds();
      for (const obs of this.obstacles.obstacles) {
        const obsBounds = obs.getBounds();
        
        if (obs.x + obs.width < this.player.x && !obs.passed) {
          obs.passed = true;
        }
        
        if (
          playerBounds.x < obsBounds.x + obsBounds.width &&
          playerBounds.x + playerBounds.width > obsBounds.x &&
          playerBounds.y < obsBounds.y + obsBounds.height &&
          playerBounds.y + playerBounds.height > obsBounds.y
        ) {
          if (this.immunityCount > 0) {
            this.immunityCount--;
            this.particles.spawnShieldBreak(
              this.player.x + this.player.width / 2,
              this.player.y + this.player.height / 2
            );
            obs.x = -1000;
            continue;
          }
          this.triggerHit();
          this.gameOver();
        }
      }
    }
    
    // 状态切换输入
    if (this.input.jumpPressed) {
      if (this.state === 'gameover' || this.state === 'win') {
        this.start();
      }
      this.input.jumpPressed = false;
    }
    
    // ESC 返回菜单
    if (this.input.backToMenu) {
      if (this.state === 'gameover' || this.state === 'win') {
        this.stopLevel();
      }
      this.input.backToMenu = false;
    }
    
    // 开始菜单选择
    if (this.state === 'start') {
      if (this.input.selectEndless) {
        this.mode = GAME_MODE.ENDLESS;
        this.start();
        this.input.selectEndless = false;
      }
      if (this.input.selectLevel) {
        // 加载示例关卡（后续可改为文件选择）
        const exampleLevel = this.createExampleLevel();
        this.loadLevel(exampleLevel);
        this.start();
        this.input.selectLevel = false;
      }
      if (this.input.editorClear) {
        this.startRecording();
        this.resetLevel();
        this.state = 'running';
        this.input.editorClear = false;
      }
      // T 键进入完整编辑器
      if (this.input.editorTest) {
        this.openEditor();
        this.input.editorTest = false;
      }
    }
    
    // 完整编辑器模式（DOM 事件在 Editor.init 中绑定）
    // 不需要在这里处理输入
  }
  
  // 打开完整编辑器
  openEditor() {
    this.audio.init();
    this.showEditorUI = true;
    this.mode = GAME_MODE.EDITOR;
    
    // 创建并初始化新编辑器（DOM 版本）
    this.editor = new Editor(this);
    this.editor.init();
    
    // 游戏继续运行，但处于编辑器模式
    this.resetLevel();
    this.state = 'running';
    
    console.log('[编辑器] 已启动 - 点击时间轴添加/拖动障碍');
  }
  
  // 创建示例关卡（临时）
  createExampleLevel() {
    return {
      meta: { name: '示例关卡', author: 'system', version: 1 },
      config: { baseSpeed: 6, gravity: 1.2, spawnOffset: 300 },
      timeline: [
        { time: 1500, type: 'low', xOffset: 0 },
        { time: 2800, type: 'low', xOffset: 0 },
        { time: 4000, type: 'air', xOffset: 0 },
        { time: 5200, type: 'low', xOffset: 0 },
        { time: 6500, type: 'air', xOffset: 0 },
        { time: 7800, type: 'low', xOffset: 0 },
        { time: 9000, type: 'low', xOffset: 0 }
      ]
    };
  }
  
  draw() {
    let shakeX = 0, shakeY = 0;
    if (this.shakeTimer > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeY = (Math.random() - 0.5) * this.shakeIntensity;
    }
    
    this.renderer.clear();
    this.renderer.ctx.save();
    this.renderer.ctx.translate(shakeX, shakeY);
    
    this.renderer.drawGround();
    this.player.draw(this.renderer.ctx);
    this.obstacles.draw(this.renderer.ctx);
    this.particles.draw(this.renderer.ctx);
    
    this.renderer.ctx.restore();
    this.renderer.drawUI(this);
  }
  
  loop(timestamp) {
    this.time.update(timestamp);
    this.update();
    this.draw();
    requestAnimationFrame(this.loop);
  }
}
