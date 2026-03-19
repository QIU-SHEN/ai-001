// ============================================
// Input - 处理键盘/鼠标输入
// ============================================
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.jumpPressed = false;
    this.slidePressed = false;
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
  }
}
