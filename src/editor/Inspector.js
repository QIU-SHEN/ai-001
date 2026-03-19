// ============================================
// Inspector - 属性检查器（DOM 版本）
// ============================================

export class Inspector {
  constructor(editor) {
    this.editor = editor;
    this.typeSelect = document.getElementById('inspType');
    this.timeInput = document.getElementById('inspTime');
    this.xOffsetInput = document.getElementById('inspXOffset');
    
    this.currentEventId = null;
    
    this.init();
  }
  
  init() {
    this.bindEvents();
  }
  
  bindEvents() {
    // 类型变更
    this.typeSelect.addEventListener('change', () => {
      if (this.currentEventId) {
        this.editor.updateEvent(this.currentEventId, {
          type: this.typeSelect.value
        });
      }
    });
    
    // 时间变更（带吸附）
    this.timeInput.addEventListener('change', () => {
      if (this.currentEventId) {
        const time = this.snap(parseInt(this.timeInput.value) || 0);
        this.editor.updateEvent(this.currentEventId, { time });
        this.timeInput.value = time;
      }
    });
    
    // X偏移变更
    this.xOffsetInput.addEventListener('change', () => {
      if (this.currentEventId) {
        this.editor.updateEvent(this.currentEventId, {
          xOffset: parseInt(this.xOffsetInput.value) || 0
        });
      }
    });
  }
  
  snap(time) {
    const step = 100; // ms
    return Math.round(time / step) * step;
  }
  
  // 更新显示
  update(event) {
    if (event) {
      this.currentEventId = event.id;
      this.typeSelect.value = event.type;
      this.timeInput.value = event.time;
      this.xOffsetInput.value = event.xOffset || 0;
      
      this.enable(true);
    } else {
      this.currentEventId = null;
      this.typeSelect.value = 'low';
      this.timeInput.value = '';
      this.xOffsetInput.value = '';
      
      this.enable(false);
    }
  }
  
  enable(enabled) {
    this.typeSelect.disabled = !enabled;
    this.timeInput.disabled = !enabled;
    this.xOffsetInput.disabled = !enabled;
  }
}
