// ============================================
// Renderer - 处理所有绘制逻辑
// ============================================
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from '../core/Constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual canvas size to match DPR for sharp rendering
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    
    // Scale canvas via CSS to display size
    canvas.style.width = CANVAS_WIDTH + 'px';
    canvas.style.height = CANVAS_HEIGHT + 'px';
    
    this.ctx = canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    
    // Improve text rendering
    this.ctx.textRendering = 'geometricPrecision';
    this.ctx.imageSmoothingEnabled = false;
  }

  clear() {
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  drawGround() {
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    this.ctx.fillStyle = '#555';
    this.ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);
  }

  drawUI(game) {
    const { score, highScore, state, player, perfectJumpTimer } = game;
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(Math.floor(score), CANVAS_WIDTH - 30, 40);
    
    // High score
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = '#888';
    this.ctx.fillText(`HI: ${Math.floor(highScore)}`, CANVAS_WIDTH - 30, 65);
    
    // 完美跳跃提示 - 显示在玩家头顶
    if (perfectJumpTimer > 0) {
      const alpha = Math.min(1, perfectJumpTimer / 20);
      this.ctx.save();
      this.ctx.translate(player.x + player.width / 2, player.y - 25);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PERFECT!', 0, 0);
      this.ctx.restore();
    }
    
    if (state === 'start') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('RUNNER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('SPACE: Jump (Double Jump) | DOWN: Slide', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      this.ctx.fillText('Press SPACE to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    } else if (state === 'gameover') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      const s = Math.floor(score);
      let rating = 'Needs Improvement';
      if (s >= 1000) rating = 'Elite';
      else if (s >= 500) rating = 'Strong';
      else if (s >= 200) rating = 'Decent';
      
      this.ctx.font = '24px "Courier New", monospace';
      this.ctx.fillText(`Score: ${s}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      this.ctx.fillText(rating, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('Press SPACE to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    }
  }
}
