// ============================================
// Timeline - 时间轴可视化（DOM 版本）
// ============================================

export class Timeline {
  constructor(editor, containerId) {
    this.editor = editor;
    this.container = document.getElementById(containerId);
    this.track = this.container.querySelector('#timelineTrack');
    this.grid = this.container.querySelector('#timeGrid');
    
    // 配置 - 使用像素/秒作为单位，更直观
    this.pixelsPerSecond = 100; // 默认 100px = 1秒
    this.snapStep = 100; // ms
    
    // 缩放级别：0.5x, 0.75x, 1x, 1.5x, 2x, 3x, 4x
    this.zoomLevels = [50, 75, 100, 150, 200, 300, 400];
    this.currentZoomIndex = 2; // 默认 1x (100px/s)
    
    // 拖拽状态
    this.isDragging = false;
    this.dragEvent = null;
    this.dragStartX = 0;
    this.dragStartTime = 0;
    this.hasDragged = false; // 标记是否真正发生了拖拽
    this.isAdding = false; // 防止重复添加
    
    this.init();
  }
  
  init() {
    this.bindEvents();
    this.bindDragEvents();
    this.renderGrid();
    this.bindWheel();
    this.createPlayhead();
  }
  
  // 创建播放指针
  createPlayhead() {
    this.playhead = document.createElement('div');
    this.playhead.className = 'playhead';
    this.playhead.style.cssText = `
      position: absolute;
      top: 0;
      width: 2px;
      height: 100%;
      background: #0f0;
      pointer-events: none;
      z-index: 10;
      left: 0px;
    `;
    this.track.appendChild(this.playhead);
  }
  
  // 更新播放指针位置
  updatePlayhead(timeMs) {
    if (!this.playhead) return;
    const x = this.timeToX(timeMs);
    this.playhead.style.left = x + 'px';
    
    // 自动滚动跟随
    const containerRect = this.container.getBoundingClientRect();
    const playheadX = x - this.container.scrollLeft;
    
    // 如果播放指针超出可视区域，自动滚动
    if (playheadX < 0 || playheadX > containerRect.width - 100) {
      this.container.scrollLeft = x - containerRect.width / 2;
    }
  }
  
  bindWheel() {
    // 滚轮缩放 - 直接在时间轴区域滚轮即可
    this.container.addEventListener('wheel', (e) => {
      // 只处理水平滚轮或带Shift的滚轮作为缩放
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && !e.shiftKey) {
        // 垂直滚轮 = 缩放
        e.preventDefault();
        e.stopPropagation();
        
        if (e.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      }
    }, { passive: false });
  }
  
  zoomIn() {
    if (this.currentZoomIndex < this.zoomLevels.length - 1) {
      this.currentZoomIndex++;
      this.applyZoom();
    }
  }
  
  zoomOut() {
    if (this.currentZoomIndex > 0) {
      this.currentZoomIndex--;
      this.applyZoom();
    }
  }
  
  applyZoom() {
    // 保存当前中心点时间
    const containerWidth = this.container.clientWidth;
    const centerX = this.container.scrollLeft + containerWidth / 2;
    const centerTime = this.xToTime(centerX);
    
    // 应用新的缩放级别
    const zoomPercent = this.zoomLevels[this.currentZoomIndex];
    this.pixelsPerSecond = zoomPercent;
    
    console.log(`[Timeline] 缩放: ${zoomPercent}px/s (${zoomPercent/100}x)`);
    
    // 重新渲染
    this.renderGrid();
    this.render();
    
    // 恢复中心点位置
    const newCenterX = this.timeToX(centerTime);
    this.container.scrollLeft = newCenterX - containerWidth / 2;
  }
  
  bindEvents() {
    // 点击时间轴添加事件
    // 使用 mousedown 记录位置，mouseup 判断是否是点击
    let mouseDownTime = 0;
    let mouseDownX = 0;  // 相对于 track 内容的位置（考虑滚动）
    let mouseDownY = 0;
    let hasMoved = false;
    
    this.track.addEventListener('mousedown', (e) => {
      // 只响应左键，且不是点击事件块
      if (e.button !== 0 || e.target.closest('.event-block')) return;
      
      mouseDownTime = Date.now();
      hasMoved = false;
      
      // 记录相对于 track 内容的位置
      // getBoundingClientRect().left 已经考虑了滚动（会为负值当滚动后）
      const rect = this.track.getBoundingClientRect();
      mouseDownX = e.clientX - rect.left;
      mouseDownY = e.clientY - rect.top;
      
      const onMouseMove = () => {
        hasMoved = true;
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        // 如果是快速点击且没有移动，则添加事件
        const timeDiff = Date.now() - mouseDownTime;
        
        // 点击判定：时间短(<200ms) + 没有移动过
        if (timeDiff < 200 && !hasMoved) {
          this.addEventAtPosition(mouseDownX);
        }
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
  
  // 在指定位置添加事件（直接使用已计算好的 x 坐标）
  addEventAtPosition(x) {
    // 防止重复点击
    if (this.isAdding) return;
    this.isAdding = true;
    setTimeout(() => { this.isAdding = false; }, 100);
    
    const time = this.snap(this.xToTime(x));
    
    // 限制在有效时间范围内
    const clampedTime = Math.max(0, Math.min(this.editor.state.duration, time));
    
    // 默认添加 low 类型
    this.editor.addEvent({
      id: this.generateId(),
      time: clampedTime,
      type: this.editor.defaultType || 'low',
      xOffset: 0
    });
  }
  
  // 绑定拖拽事件（在 init 中单独调用）
  bindDragEvents() {
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
  
  // 时间转像素位置
  timeToX(time) {
    // time 是毫秒，转换为秒再乘以 pixelsPerSecond
    return (time / 1000) * this.pixelsPerSecond;
  }
  
  // 像素位置转时间
  xToTime(x) {
    return (x / this.pixelsPerSecond) * 1000;
  }
  
  // 渲染时间刻度
  renderGrid() {
    this.grid.innerHTML = '';
    const duration = this.editor.state.duration;
    const step = 1000; // 每秒一个刻度
    
    // 设置 track 宽度为容纳整个时间轴
    const trackWidth = Math.max(900, this.timeToX(duration) + 100);
    this.track.style.width = trackWidth + 'px';
    
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
    
    // 阻止默认行为和冒泡
    e.preventDefault();
    e.stopPropagation();
    
    // 重置拖拽标志
    this.hasDragged = false;
    this.isDragging = true;
    this.dragEvent = event;
    
    // 保存相对于 track 的位置
    const rect = this.track.getBoundingClientRect();
    this.dragStartX = e.clientX - rect.left + this.container.scrollLeft;
    this.dragStartTime = event.time;
    
    el.classList.add('dragging');
    this.editor.selectEvent(eventId);
  }
  
  onDrag(e) {
    if (!this.dragEvent) return;
    
    // 标记发生了拖拽
    this.hasDragged = true;
    
    // 考虑容器的滚动位置
    const rect = this.track.getBoundingClientRect();
    const scrollLeft = this.container.scrollLeft;
    const currentX = e.clientX - rect.left + scrollLeft;
    const deltaX = currentX - this.dragStartX;
    
    // 像素转时间：像素 / (像素/秒) = 秒，再转毫秒
    const deltaTimeSeconds = deltaX / this.pixelsPerSecond;
    const deltaTimeMs = deltaTimeSeconds * 1000;
    const newTime = this.snap(this.dragStartTime + deltaTimeMs);
    
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
    const durationInput = document.getElementById('edDurationInput');
    const countEl = document.getElementById('edEventCount');
    const scaleEl = document.getElementById('edScale');
    
    // 更新时长输入框（如果用户没有正在编辑）
    if (durationInput && document.activeElement !== durationInput) {
      durationInput.value = this.editor.state.duration / 1000;
    }
    if (countEl) {
      countEl.textContent = this.editor.state.events.length;
    }
    if (scaleEl) {
      // 显示缩放级别
      const zoomPercent = this.zoomLevels[this.currentZoomIndex];
      scaleEl.textContent = zoomPercent;
    }
  }
  
  // 更新缩放
  setScale(pxPerSecond) {
    this.scale = pxPerSecond / 1000;
    this.renderGrid();
    this.render();
  }
}
