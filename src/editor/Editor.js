// ============================================
// Editor - 关卡编辑器主控制器
// ============================================
import { Timeline } from './Timeline.js';
import { Inspector } from './Inspector.js';

export class Editor {
  constructor(game) {
    this.game = game;
    
    // 编辑器状态（按 prompt.md 要求）
    this.state = {
      duration: 10000, // ms
      scale: 100, // px per second
      events: [],
      selectedEventId: null,
      currentTime: 0,
      isPlaying: false
    };
    
    this.defaultType = 'low';
    
    // 子模块
    this.timeline = null;
    this.inspector = null;
    
    // 播放循环
    this.playLoop = null;
    this.lastPlayTime = 0;
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
    this.stopPlay();
    document.getElementById('editorUI').classList.remove('active');
  }
  
  bindButtons() {
    document.getElementById('btnPlay').addEventListener('click', () => this.play());
    document.getElementById('btnPause').addEventListener('click', () => this.pause());
    document.getElementById('btnAddLow').addEventListener('click', () => {
      this.addEvent({
        id: this.generateId(),
        time: this.state.currentTime,
        type: 'low',
        xOffset: 0
      });
    });
    document.getElementById('btnAddAir').addEventListener('click', () => {
      this.addEvent({
        id: this.generateId(),
        time: this.state.currentTime,
        type: 'air',
        xOffset: 0
      });
    });
    document.getElementById('btnDelete').addEventListener('click', () => {
      if (this.state.selectedEventId) {
        this.deleteEvent(this.state.selectedEventId);
      }
    });
    document.getElementById('btnExport').addEventListener('click', () => this.exportLevel());
    document.getElementById('btnPlaytest').addEventListener('click', () => this.playtest());
    
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('editorUI').classList.contains('active')) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.state.selectedEventId) {
          this.deleteEvent(this.state.selectedEventId);
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }
  
  generateId() {
    return 'e' + Date.now() + Math.random().toString(36).substr(2, 5);
  }
  
  // ========== 核心 API ==========
  
  addEvent(event) {
    this.state.events.push(event);
    this.sortEvents();
    this.timeline.render();
    this.selectEvent(event.id);
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
    }
  }
  
  deleteEvent(id) {
    this.state.events = this.state.events.filter(e => e.id !== id);
    
    if (this.state.selectedEventId === id) {
      this.state.selectedEventId = null;
      this.inspector.update(null);
    }
    
    this.timeline.render();
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
  
  // ========== 播放控制 ==========
  
  play() {
    if (this.state.isPlaying) return;
    
    this.state.isPlaying = true;
    this.lastPlayTime = performance.now();
    
    document.getElementById('btnPlay').style.display = 'none';
    document.getElementById('btnPause').style.display = 'block';
    
    const loop = (now) => {
      if (!this.state.isPlaying) return;
      
      const delta = now - this.lastPlayTime;
      this.lastPlayTime = now;
      
      this.state.currentTime += delta;
      
      // 循环播放
      if (this.state.currentTime > this.state.duration) {
        this.state.currentTime = 0;
      }
      
      this.timeline.render();
      this.playLoop = requestAnimationFrame(loop);
    };
    
    this.playLoop = requestAnimationFrame(loop);
  }
  
  pause() {
    this.state.isPlaying = false;
    cancelAnimationFrame(this.playLoop);
    
    document.getElementById('btnPlay').style.display = 'block';
    document.getElementById('btnPause').style.display = 'none';
  }
  
  stopPlay() {
    this.pause();
    this.state.currentTime = 0;
    this.timeline.render();
  }
  
  togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
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
        baseSpeed: 6,
        gravity: 1.2,
        spawnOffset: 500,    // 生成提前量（像素）
        preloadTime: 2000    // 预加载时间（毫秒）
      },
      timeline: this.state.events.map(e => ({
        time: e.time,
        type: e.type,
        xOffset: e.xOffset || 0
        // 注意：不包含 spawned 标记，这是运行时状态
      }))
    };
    
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
    
    // 隐藏编辑器
    this.destroy();
    
    // 加载并运行
    this.game.loadLevel(levelData);
    this.game.startLevel();
    
    console.log('[Editor] Playtest 开始 - 障碍从屏幕外预加载');
  }
}
