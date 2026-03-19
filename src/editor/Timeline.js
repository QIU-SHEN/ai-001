// ============================================
// Timeline - 时间轴可视化（DOM 版本）
// ============================================

export class Timeline {
  constructor(editor, containerId) {
    this.editor = editor;
    this.container = document.getElementById(containerId);
    this.track = this.container.querySelector('#timelineTrack');
    this.grid = this.container.querySelector('#timeGrid');
    this.playhead = this.container.querySelector('#playhead');
    
    // 配置
    this.scale = 0.1; // px per ms (100px = 1s)
    this.snapStep = 100; // ms
    
    // 拖拽状态
    this.isDragging = false;
    this.dragEvent = null;
    this.dragStartX = 0;
    this.dragStartTime = 0;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.renderGrid();
  }
  
  bindEvents() {
    // 点击时间轴添加事件
    this.track.addEventListener('click', (e) => {
      if (e.target === this.track || e.target === this.grid) {
        const rect = this.track.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const time = this.snap(this.xToTime(x));
        
        // 默认添加 low 类型，可以通过按钮切换
        this.editor.addEvent({
          id: this.generateId(),
          time,
          type: this.editor.defaultType || 'low',
          xOffset: 0
        });
      }
    });
    
    // 拖拽事件块
    this.track.addEventListener('mousedown', (e) => {
      const block = e.target.closest('.event-block');
      if (block) {
        e.preventDefault();
        this.startDrag(e, block);
      }
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.onDrag(e);
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.endDrag();
      }
    });
  }
  
  generateId() {
    return 'e' + Date.now() + Math.random().toString(36).substr(2, 5);
  }
  
  // 时间吸附
  snap(time) {
    return Math.round(time / this.snapStep) * this.snapStep;
  }
  
  timeToX(time) {
    return time * this.scale;
  }
  
  xToTime(x) {
    return x / this.scale;
  }
  
  // 渲染时间刻度
  renderGrid() {
    this.grid.innerHTML = '';
    const duration = this.editor.state.duration;
    const step = 1000; // 每秒一个刻度
    
    for (let t = 0; t <= duration; t += step) {
      const x = this.timeToX(t);
      
      const line = document.createElement('div');
      line.className = 'time-grid-line';
      line.style.left = x + 'px';
      this.grid.appendChild(line);
      
      const label = document.createElement('div');
      label.className = 'time-grid-label';
      label.style.left = (x + 2) + 'px';
      label.textContent = (t / 1000) + 's';
      this.grid.appendChild(label);
    }
  }
  
  // 渲染所有事件
  render() {
    const state = this.editor.state;
    const existing = new Map();
    
    // 收集现有 DOM 元素
    this.track.querySelectorAll('.event-block').forEach(el => {
      existing.set(el.dataset.id, el);
    });
    
    // 更新或创建事件块
    state.events.forEach(event => {
      let el = existing.get(event.id);
      
      if (!el) {
        el = this.createEventElement(event);
        this.track.appendChild(el);
      }
      
      // 更新位置
      el.style.left = this.timeToX(event.time) + 'px';
      
      // 更新选中状态
      if (event.id === state.selectedEventId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
      
      // 更新类型样式
      el.classList.remove('low', 'air');
      el.classList.add(event.type);
      el.textContent = event.type[0].toUpperCase();
    });
    
    // 删除不在 state 中的元素
    existing.forEach((el, id) => {
      if (!state.events.find(e => e.id === id)) {
        el.remove();
      }
    });
    
    // 更新播放指针
    this.playhead.style.left = this.timeToX(state.currentTime) + 'px';
    
    // 更新信息面板
    this.updateInfo();
  }
  
  createEventElement(event) {
    const el = document.createElement('div');
    el.className = `event-block ${event.type}`;
    el.dataset.id = event.id;
    el.textContent = event.type[0].toUpperCase();
    
    // 点击选中
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editor.selectEvent(event.id);
    });
    
    return el;
  }
  
  // 拖拽逻辑
  startDrag(e, el) {
    const eventId = el.dataset.id;
    const event = this.editor.state.events.find(e => e.id === eventId);
    
    if (!event) return;
    
    this.isDragging = true;
    this.dragEvent = event;
    this.dragStartX = e.clientX;
    this.dragStartTime = event.time;
    
    el.classList.add('dragging');
    this.editor.selectEvent(eventId);
  }
  
  onDrag(e) {
    if (!this.dragEvent) return;
    
    const deltaX = e.clientX - this.dragStartX;
    const deltaTime = deltaX / this.scale;
    const newTime = this.snap(this.dragStartTime + deltaTime);
    
    // 限制在有效范围内
    const clampedTime = Math.max(0, Math.min(this.editor.state.duration, newTime));
    
    this.editor.updateEvent(this.dragEvent.id, { time: clampedTime });
  }
  
  endDrag() {
    const el = this.track.querySelector('.event-block.dragging');
    if (el) {
      el.classList.remove('dragging');
    }
    
    this.isDragging = false;
    this.dragEvent = null;
  }
  
  updateInfo() {
    const durationEl = document.getElementById('edDuration');
    const countEl = document.getElementById('edEventCount');
    const scaleEl = document.getElementById('edScale');
    
    if (durationEl) {
      durationEl.textContent = (this.editor.state.duration / 1000) + 's';
    }
    if (countEl) {
      countEl.textContent = this.editor.state.events.length;
    }
    if (scaleEl) {
      scaleEl.textContent = Math.round(this.scale * 1000);
    }
  }
  
  // 更新缩放
  setScale(pxPerSecond) {
    this.scale = pxPerSecond / 1000;
    this.renderGrid();
    this.render();
  }
}
