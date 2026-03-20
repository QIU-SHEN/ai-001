// ============================================
// Input - 处理键盘/鼠标输入
// ============================================
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    
    // 跳跃：触发式（按一下跳一下）
    this.jumpPressed = false;
    this.jumpTriggered = false; // 标记是否已处理此次跳跃
    this.jumpKeyDown = false; // 标记按键是否正被按住（防止keydown重复触发）
    
    // 滑步：按一下自动滑步一段时间
    this.slidePressed = false;
    this.slideDuration = 48; // 滑步持续帧数（约0.8秒 @60fps）
    this.slideTimer = 0; // 当前滑步剩余时间
    this.slideKeyDown = false; // 标记按键是否正被按住
    
    // 编辑器按键
    this.editorPlaceLow = false;      // 1
    this.editorPlaceAir = false;      // 2
    this.editorClear = false;         // R
    this.editorExport = false;        // P
    this.editorDelete = false;        // Delete
    this.editorTest = false;          // T
    this.selectEndless = false;       // E
    this.backToMenu = false;          // ESC
    this.returnToEditor = false;      // R (从 Playtest 返回编辑器)
    this.restart = false;             // Enter (重新开始)
    
    this.bindInput();
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      // 跳跃：只在按键首次按下时触发（防止按住连跳）
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        // 使用 jumpKeyDown 防止 keydown 重复触发
        if (!this.jumpKeyDown) {
          this.jumpKeyDown = true;
          this.jumpPressed = true;
          this.jumpTriggered = false;
        }
      }
      
      // 滑步：按一下开始滑步，计时结束后自动恢复
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        // 使用 slideKeyDown 防止 keydown 重复触发
        if (!this.slideKeyDown) {
          this.slideKeyDown = true;
          this.slidePressed = true;
          this.slideTimer = this.slideDuration;
        }
      }
      
      // 编辑器按键（仅触发一次）
      if (e.code === 'Digit1') {
        this.editorPlaceLow = true;
      }
      if (e.code === 'Digit2') {
        this.editorPlaceAir = true;
      }
      if (e.code === 'KeyR') {
        this.editorClear = true;
      }
      if (e.code === 'KeyP') {
        this.editorExport = true;
      }
      if (e.code === 'Delete') {
        this.editorDelete = true;
      }
      if (e.code === 'KeyT') {
        this.editorTest = true;
      }
      if (e.code === 'KeyE') {
        this.selectEndless = true;
      }
      if (e.code === 'Escape') {
        this.backToMenu = true;
      }
      if (e.code === 'KeyR') {
        this.returnToEditor = true;
      }
      if (e.code === 'Enter') {
        this.restart = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      // 跳跃：松开按键后重置 keyDown 标志
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.jumpKeyDown = false;
        this.jumpPressed = false;
        this.jumpTriggered = false;
      }
      // 滑步：松开按键不影响，由timer自动结束
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.slideKeyDown = false;
      }
      // R键：重置返回编辑器标志
      if (e.code === 'KeyR') {
        this.returnToEditor = false;
      }
      // Enter键：重置重新开始标志
      if (e.code === 'Enter') {
        this.restart = false;
      }
    });

    this.canvas.addEventListener('mousedown', () => {
      this.jumpPressed = true;
      setTimeout(() => this.jumpPressed = false, 100);
    });
  }

  reset() {
    this.jumpPressed = false;
    this.jumpTriggered = false;
    this.jumpKeyDown = false;
    this.slidePressed = false;
    this.slideTimer = 0;
    this.slideKeyDown = false;
    this.editorPlaceLow = false;
    this.editorPlaceAir = false;
    this.editorClear = false;
    this.editorExport = false;
    this.selectEndless = false;
    this.backToMenu = false;
    this.returnToEditor = false;
    this.restart = false;
    this.editorDelete = false;
    this.editorTest = false;
  }
}
