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
    const { score, highScore, state, player, perfectJumpTimer, comboCount, comboTier, immunityCount } = game;
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px "Courier New", monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(Math.floor(score), CANVAS_WIDTH - 30, 40);
    
    // High score
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = '#888';
    this.ctx.fillText(`HI: ${Math.floor(highScore)}`, CANVAS_WIDTH - 30, 65);
    
    // Combo 显示（白色字体）
    if (comboCount > 0) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 18px "Courier New", monospace';
      this.ctx.fillText(`x${comboCount}`, CANVAS_WIDTH - 30, 90);
    }
    
    // 免疫护盾显示
    if (immunityCount > 0) {
      this.ctx.fillStyle = '#0ff';
      this.ctx.font = 'bold 20px "Courier New", monospace';
      this.ctx.fillText(`♦${immunityCount}`, CANVAS_WIDTH - 30, 115);
    }
    
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
      this.ctx.fillText('RUNNER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
      
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('SPACE: 跳跃 (二段跳) | DOWN: 滑铲', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      
      // 模式选择
      this.ctx.fillStyle = '#888';
      this.ctx.fillText('选择模式:', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText('E - 无尽模式', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
      this.ctx.fillText('L - 关卡模式', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
      this.ctx.fillText('R - 录制关卡', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
    } else if (state === 'gameover') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);
      
      const s = Math.floor(score);
      let rating = '还需努力';
      if (s >= 1000) rating = '精英';
      else if (s >= 500) rating = '很强';
      else if (s >= 200) rating = '不错';
      
      this.ctx.font = '24px "Courier New", monospace';
      this.ctx.fillText(`得分: ${s}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      this.ctx.fillText(rating, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('空格: 重新开始 | ESC: 返回菜单', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    } else if (state === 'win') {
      // 关卡胜利画面
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 48px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('LEVEL CLEAR', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
      
      this.ctx.font = '24px "Courier New", monospace';
      this.ctx.fillText('关卡完成', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
      
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('空格: 重新开始 | ESC: 返回菜单', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
    }
    
    // 编辑器模式 UI
    if (game.levelSystem?.isRecording) {
      this.drawEditorUI(game);
    }
  }
  
  drawEditorUI(game) {
    const { levelSystem } = game;
    
    // 编辑器背景条
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(10, 10, 280, 150);
    
    // 标题
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('[EDITOR] 关卡编辑器', 20, 30);
    
    // 按键说明
    this.ctx.fillStyle = '#aaa';
    this.ctx.font = '14px "Courier New", monospace';
    this.ctx.fillText('1: 放置 low (跳跃)', 20, 55);
    this.ctx.fillText('2: 放置 air (滑行)', 20, 75);
    this.ctx.fillText('R: 清空 | P: 输出 JSON', 20, 95);
    this.ctx.fillText('(障碍生成在玩家前方)', 20, 115);
    
    // 已记录数量
    const count = levelSystem.recordedData.length;
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 14px "Courier New", monospace';
    this.ctx.fillText(`已记录: ${count} 个障碍`, 20, 135);
    
    // 录制时间
    const time = Math.floor(levelSystem.getLevelTime() / 100) / 10;
    this.ctx.fillStyle = '#aaa';
    this.ctx.fillText(`时间: ${time.toFixed(1)}s`, 20, 155);
  }
}
