// ============================================
// Input - 处理键盘/鼠标输入
// ============================================
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.jumpPressed = false;
    this.slidePressed = false;
    
    // 编辑器按键
    this.editorPlaceLow = false;      // 1
    this.editorPlaceAir = false;      // 2
    this.editorClear = false;         // R
    this.editorExport = false;        // P
    this.selectEndless = false;       // E
    this.selectLevel = false;         // L
    this.backToMenu = false;          // ESC
    
    this.bindInput();
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.jumpPressed = true;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        this.slidePressed = true;
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
      if (e.code === 'KeyE') {
        this.selectEndless = true;
      }
      if (e.code === 'KeyL') {
        this.selectLevel = true;
      }
      if (e.code === 'Escape') {
        this.backToMenu = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.jumpPressed = false;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        this.slidePressed = false;
      }
    });

    this.canvas.addEventListener('mousedown', () => {
      this.jumpPressed = true;
      setTimeout(() => this.jumpPressed = false, 100);
    });
  }

  reset() {
    this.jumpPressed = false;
    this.slidePressed = false;
    this.editorPlaceLow = false;
    this.editorPlaceAir = false;
    this.editorClear = false;
    this.editorExport = false;
    this.selectEndless = false;
    this.selectLevel = false;
    this.backToMenu = false;
  }
}
