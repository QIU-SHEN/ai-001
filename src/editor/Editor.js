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
      selectedEventId: null
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
    document.getElementById('editorUI').classList.remove('active');
  }
  
  bindButtons() {
    document.getElementById('btnAddLow').addEventListener('click', () => {
      this.addEvent({
        id: this.generateId(),
        time: 0, // 默认在 0ms 处添加
        type: 'low',
        xOffset: 0
      });
    });
    document.getElementById('btnAddAir').addEventListener('click', () => {
      this.addEvent({
        id: this.generateId(),
        time: 0, // 默认在 0ms 处添加
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
      if (seconds >= 5 && seconds <= 60) {
        this.setDuration(seconds * 1000);
      }
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
    this.state.duration = Math.max(5000, Math.min(60000, duration)); // 限制 5-60 秒
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
        preloadTime: 2000
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
    
    // 重置编辑器相关状态
    this.game.showEditorUI = false;
    
    // 加载并运行关卡
    this.game.loadLevel(levelData);
    this.game.startLevel();
    
    console.log('[Editor] Playtest 开始 - 编辑的数据已加载到游戏中');
  }
}
