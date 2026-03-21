// ============================================
// Editor - 关卡编辑器主控制器
// ============================================
import { Timeline } from './Timeline.js';
import { Inspector } from './Inspector.js';

export class Editor {
  constructor(game) {
    this.game = game;
    
    // 编辑器状态（简化版）
    this.state = {
      duration: 10000, // ms
      events: [],
      selectedEventId: null,
      timeShift: 0     // 整体后移偏移量（毫秒）
    };
    
    this.defaultType = 'low';
    
    // 子模块
    this.timeline = null;
    this.inspector = null;
    
    // 播放循环
    this.playLoop = null;
    this.lastPlayTime = 0;
    
    // 音频播放器引用
    this.audioPlayer = null;
    this.audioUpdateId = null;
  }
  
  // ========== 初始化 ==========
  
  init() {
    // 显示编辑器 UI
    document.getElementById('editorUI').classList.add('active');
    
    // 初始化子模块
    this.timeline = new Timeline(this, 'timelineContainer');
    this.inspector = new Inspector(this);
    
    // 绑定按钮事件
    this.bindButtons();
    
    // 初始渲染
    this.timeline.render();
    
    console.log('[Editor] 已初始化');
  }
  
  destroy() {
    document.getElementById('editorUI').classList.remove('active');
    this.stopAudioSync();
  }
  
  bindButtons() {
    document.getElementById('btnAddLow').addEventListener('click', () => {
      this.defaultType = 'low'; // 设置默认类型
      this.addEvent({
        id: this.generateId(),
        time: 0,
        type: 'low',
        xOffset: 0
      });
    });
    document.getElementById('btnAddAir').addEventListener('click', () => {
      this.defaultType = 'air'; // 设置默认类型
      this.addEvent({
        id: this.generateId(),
        time: 0,
        type: 'air',
        xOffset: 0
      });
    });
    document.getElementById('btnDelete').addEventListener('click', () => {
      if (this.state.selectedEventId) {
        this.deleteEvent(this.state.selectedEventId);
      }
    });
    document.getElementById('btnExport').addEventListener('click', () => {
      console.log('[Editor] 保存按钮点击, window.saveLevel:', typeof window.saveLevel);
      // 如果有仓库则保存到仓库，否则导出 JSON
      if (window.saveLevel) {
        window.saveLevel();
      } else {
        this.exportLevel();
        alert('关卡 JSON 已导出到控制台（剪贴板权限可能受限）');
      }
    });
    document.getElementById('btnPlaytest').addEventListener('click', () => this.playtest());
    
    // 缩放按钮
    document.getElementById('btnZoomIn').addEventListener('click', () => {
      this.timeline.zoomIn();
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
      this.timeline.zoomOut();
    });
    
    // 时长设置
    document.getElementById('btnSetDuration').addEventListener('click', () => {
      const input = document.getElementById('edDurationInput');
      const seconds = parseInt(input.value, 10);
      if (seconds >= 5 && seconds <= 300) {
        this.setDuration(seconds * 1000);
      }
    });
    
    // 整体后移设置
    document.getElementById('btnSetTimeShift').addEventListener('click', () => {
      const input = document.getElementById('edTimeShiftInput');
      const ms = parseInt(input.value, 10) || 0;
      this.state.timeShift = Math.max(-2000, Math.min(2000, ms));
      console.log('[Editor] 设置整体后移:', this.state.timeShift, 'ms');
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('editorUI').classList.contains('active')) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.state.selectedEventId) {
          this.deleteEvent(this.state.selectedEventId);
        }
      }
    });
  }
  
  generateId() {
    return 'e' + Date.now() + Math.random().toString(36).substr(2, 5);
  }
  
  // ========== 核心 API ==========
  
  addEvent(event) {
    // 检查是否已存在相同ID的事件（防止重复添加）
    if (this.state.events.find(e => e.id === event.id)) {
      return;
    }
    
    this.state.events.push(event);
    this.sortEvents();
    this.timeline.render();
    this.selectEvent(event.id);
    // 注意：编辑器模式下不生成游戏障碍，只编辑数据
  }
  
  // 设置关卡总时长
  setDuration(duration) {
    this.state.duration = Math.max(5000, Math.min(300000, duration)); // 限制 5-300 秒（5分钟）
    this.timeline.renderGrid();
    this.timeline.render();
    this.updateInfo();
  }
  
  updateEvent(id, patch) {
    const event = this.state.events.find(e => e.id === id);
    if (event) {
      Object.assign(event, patch);
      this.sortEvents();
      this.timeline.render();
      
      // 更新 Inspector
      if (id === this.state.selectedEventId) {
        this.inspector.update(event);
      }
      // 注意：编辑器模式下不更新游戏障碍，只编辑数据
    }
  }
  
  deleteEvent(id) {
    this.state.events = this.state.events.filter(e => e.id !== id);
    
    if (this.state.selectedEventId === id) {
      this.state.selectedEventId = null;
      this.inspector.update(null);
    }
    
    this.timeline.render();
    // 注意：编辑器模式下不更新游戏障碍
  }
  
  selectEvent(id) {
    this.state.selectedEventId = id;
    
    const event = this.state.events.find(e => e.id === id);
    this.inspector.update(event);
    this.timeline.render();
  }
  
  sortEvents() {
    this.state.events.sort((a, b) => a.time - b.time);
  }
  
  // ========== 音频控制 ==========
  
  /**
   * 设置音频播放器
   * @param {AudioPlayer} audioPlayer
   */
  setAudioPlayer(audioPlayer) {
    this.audioPlayer = audioPlayer;
    
    // 设置音频加载完成回调
    this.audioPlayer.onLoaded = () => {
      const duration = this.audioPlayer.getDuration();
      console.log('[Editor] 音频加载完成，时长:', duration, 'ms');
      // 自动设置关卡时长为音频时长
      this.setDuration(duration);
      // 更新时间轴输入框
      const input = document.getElementById('edDurationInput');
      if (input) input.value = Math.floor(duration / 1000);
    };
    
    // 开始播放指针更新循环
    this.startAudioSync();
  }
  
  /**
   * 从打点记录器同步事件
   * @param {Array} events - BeatRecorder 的事件数组
   */
  syncFromRecorder(events) {
    // 转换为编辑器事件格式
    this.state.events = events.map(e => ({
      id: e.id,
      time: e.time,
      type: e.type,
      xOffset: e.xOffset || 0
    }));
    
    // 刷新显示
    this.timeline.render();
    this.updateInfo();
    
    console.log('[Editor] 从打点记录器同步', events.length, '个事件');
  }
  
  /**
   * 开始音频同步更新
   */
  startAudioSync() {
    const update = () => {
      if (this.audioPlayer && this.audioPlayer.isPlaying()) {
        const currentTime = this.audioPlayer.getCurrentTime();
        this.timeline.updatePlayhead(currentTime);
      }
      this.audioUpdateId = requestAnimationFrame(update);
    };
    update();
  }
  
  /**
   * 停止音频同步
   */
  stopAudioSync() {
    if (this.audioUpdateId) {
      cancelAnimationFrame(this.audioUpdateId);
      this.audioUpdateId = null;
    }
  }
  
  // ========== 导入/导出 ==========
  
  exportLevel() {
    const levelData = {
      meta: {
        name: 'Custom Level',
        author: 'editor',
        version: 1
      },
      config: {
        baseSpeed: 5,        // 默认速度 5px/帧
        gravity: 1.2,
        spawnOffset: 600,    // 600px 提前量，确保平滑滑入
        preloadTime: 2000,
        timeShift: this.state.timeShift || 0  // 整体后移偏移量
      },
      timeline: this.state.events.map(e => ({
        time: e.time,
        type: e.type,
        xOffset: e.xOffset || 0
        // 注意：不包含 spawned 标记，这是运行时状态
      }))
    };
    
    // 添加音频信息（如果已加载）
    if (this.audioPlayer && this.audioPlayer.fileName) {
      levelData.audio = {
        file: this.audioPlayer.fileName,
        offset: 0
      };
      levelData._audioUrl = this.audioPlayer.audioUrl;
    }
    
    const json = JSON.stringify(levelData, null, 2);
    console.log('[Editor] 导出关卡：');
    console.log(json);
    
    // 复制到剪贴板
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json);
    }
    
    return levelData;
  }
  
  playtest() {
    const levelData = this.exportLevel();
    
    if (!levelData.timeline.length) {
      console.warn('[Editor] Timeline 为空，请先添加障碍');
      return;
    }
    
    // 使用 Game 的方法保存状态并进入 Playtest
    this.game.startPlaytestFromEditor(levelData);
  }
}
