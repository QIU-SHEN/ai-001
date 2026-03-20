// ============================================
// Game - UGC 关卡系统重构版
// ============================================
import { 
  START_SPEED, BASE_SPEED, MAX_SPEED,
  lerp, easeOutQuad,
  SLIDE_BOOST_MIN, SLIDE_BOOST_MAX, COMBO_THRESHOLD, CANVAS_WIDTH, CANVAS_HEIGHT,
  COMBO_IMMUNITY
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
    
    // 暴露 Obstacle 类供编辑器使用
    this.Obstacle = Obstacle;
    
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
    
    // 编辑器（延迟初始化）
    this.editor = null;
    
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
    this.showEditorUI = false; // 退出编辑器模式
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
    
    // 清理关卡数据的 spawned 标记
    if (this.currentLevel && this.currentLevel.timeline) {
      this.currentLevel.timeline.forEach(item => {
        item.spawned = false;
      });
    }
    
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
  }
  
  stopLevel() {
    this.state = 'start';
    // 隐藏音频面板
    if (window.showAudioPanel) window.showAudioPanel(false);
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
  
  // ========== Timeline 驱动生成（带预加载缓冲）==========
  
  processTimeline(deltaTime) {
    if (this.mode === GAME_MODE.ENDLESS) return; // 无尽模式不使用 timeline
    if (this.mode === GAME_MODE.EDITOR) return; // 编辑器模式不检查胜利
    if (!this.currentLevel) return;
    
    const timeline = this.currentLevel.timeline;
    const config = this.currentLevel.config;
    
    // 计算预加载提前时间（根据速度和距离）
    const spawnOffset = config.spawnOffset || 500; // 像素
    const preloadTime = config.preloadTime || 2000; // 毫秒（备用）
    const speed = this.currentSpeed;
    
    // 基于距离的预加载时间
    // speed 是每帧像素数 @60fps，所以每秒速度是 speed * 60
    const speedPerSecond = speed * 60;
    // 计算障碍从屏幕外移动到玩家位置所需的时间
    // spawnOffset 是生成点到玩家的距离
    const timeToReachPlayer = (spawnOffset / speedPerSecond) * 1000;
    // 提前生成时间 = 移动时间
    const timeAhead = timeToReachPlayer;
    
    // 按时间顺序生成障碍（带预加载）
    while (this.timelineIndex < timeline.length) {
      const item = timeline[this.timelineIndex];
      
      // 提前生成：在障碍预定时间之前 timeAhead 毫秒生成
      const spawnTriggerTime = item.time - timeAhead;
      
      if (this.levelTime >= spawnTriggerTime && !item.spawned) {
        // 生成位置：屏幕右侧外
        // 确保障碍在时间 = item.time 时刚好到达玩家位置 (x=100)
        // spawnOffset 应该等于 timeAhead 时间内移动的距离
        const spawnX = CANVAS_WIDTH + spawnOffset;
        
        const obstacle = ObstacleFactory.create({
          type: item.type,
          spawnX: spawnX,
          xOffset: item.xOffset || 0
        });
        
        if (obstacle) {
          this.obstacles.obstacles.push(obstacle);
          item.spawned = true; // 标记已生成，避免重复
          
          // 调试：输出生成时机
          console.log(`[Spawn] ${item.type} @ t=${Math.floor(this.levelTime)}ms, will reach player @ t=${item.time}ms, spawnX=${spawnX}`);
        }
        
        this.timelineIndex++;
      } else if (this.levelTime < spawnTriggerTime) {
        // 还没到生成时间，后面的也不用检查
        break;
      } else {
        // 已生成或跳过，继续下一个
        this.timelineIndex++;
      }
    }
    
    // 检查关卡完成（所有障碍已生成且通过）
    const allSpawned = timeline.every(item => item.spawned);
    if (allSpawned) {
      const activeObstacles = this.obstacles.obstacles.filter(o => o.x + o.width > 0).length;
      if (activeObstacles === 0) {
        this.levelComplete();
      }
    }
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
    

    if (this.state === 'running') {
      // 编辑器模式下不更新游戏世界（只编辑，不运行）
      if (this.showEditorUI) {
        // 编辑器模式：不更新游戏，编辑器有自己的时间轴播放循环
        return; // 跳过游戏更新
      }
      
      // 正常游戏模式更新
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
    
    // 重新开始（回车键）
    if (this.input.restart) {
      if (this.state === 'gameover' || this.state === 'win') {
        this.start();
      }
      this.input.restart = false;
    }
    
    // ESC 返回菜单
    if (this.input.backToMenu) {
      // Playtest 模式下返回主菜单
      if (this.previousEditorState && this.state === 'running') {
        this.stopLevel();
        this.previousEditorState = null; // 清除编辑器状态
      }
      // 游戏结束/胜利状态返回菜单
      else if (this.state === 'gameover' || this.state === 'win') {
        this.stopLevel();
      }
      this.input.backToMenu = false;
    }
    
    // R 键返回编辑器（从 Playtest 返回）
    if (this.input.returnToEditor && this.previousEditorState) {
      this.returnToEditor();
      this.input.returnToEditor = false;
    }
    
    // 开始菜单选择
    if (this.state === 'start') {
      if (this.input.selectEndless) {
        this.mode = GAME_MODE.ENDLESS;
        this.start();
        this.input.selectEndless = false;
        // 隐藏关卡仓库面板
        document.getElementById('levelSelectPanel')?.classList.remove('active');
      }
      // T 键进入完整编辑器
      if (this.input.editorTest) {
        this.openEditor();
        this.input.editorTest = false;
        // 隐藏关卡仓库面板
        document.getElementById('levelSelectPanel')?.classList.remove('active');
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
    
    // 清除之前保存的编辑器状态（新的编辑会话）
    this.previousEditorState = null;
    
    // 显示音频面板
    if (window.showAudioPanel) window.showAudioPanel(true);
    
    console.log('[编辑器] 已启动 - 纯编辑模式，编辑完成后点击 Playtest 测试');
  }
  
  // 保存编辑器状态并进入 Playtest
  startPlaytestFromEditor(levelData) {
    // 保存编辑器状态，以便返回时恢复
    this.previousEditorState = {
      events: JSON.parse(JSON.stringify(this.editor.state.events)),
      duration: this.editor.state.duration
    };
    
    // 隐藏编辑器但不销毁数据
    this.editor.destroy();
    
    // 加载关卡并运行
    this.loadLevel(levelData);
    this.startLevel();
    
    // 隐藏音频面板
    if (window.showAudioPanel) window.showAudioPanel(false);
    
    console.log('[Editor] Playtest 开始 - 按 R 返回编辑器');
  }
  
  // 从 Playtest 返回编辑器
  returnToEditor() {
    if (!this.previousEditorState) return;
    
    // 停止游戏
    this.stopLevel();
    
    // 恢复编辑器状态
    this.showEditorUI = true;
    this.mode = GAME_MODE.EDITOR;
    
    // 重新创建编辑器并恢复数据
    this.editor = new Editor(this);
    this.editor.state.events = JSON.parse(JSON.stringify(this.previousEditorState.events));
    this.editor.state.duration = this.previousEditorState.duration;
    this.editor.init();
    
    // 显示音频面板
    if (window.showAudioPanel) window.showAudioPanel(true);
    
    // 恢复显示（由 editor.init() 处理）
    document.getElementById('editorUI').classList.add('active');
    
    console.log('[Editor] 返回编辑器 - 继续编辑');
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
