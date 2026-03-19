// ============================================
// Obstacle
// ============================================
import { GROUND_Y } from '../core/Constants.js';

export class Obstacle {
  constructor(type, x) {
    this.type = type;
    this.x = x;
    this.passed = false;
    
    if (type === 'low') {
      this.width = 30;
      this.height = 40;
      this.y = GROUND_Y - this.height;
    } else {
      this.width = 40;
      this.height = 35;
      this.y = GROUND_Y - 80;
    }
  }
  
  update(speed, timeScale) {
    this.x -= speed * timeScale;
  }
  
  draw(ctx) {
    ctx.fillStyle = '#666';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    ctx.fillStyle = '#444';
    const pad = 3;
    ctx.fillRect(this.x + pad, this.y + pad, this.width - pad * 2, this.height - pad * 2);
  }
  
  getBounds() {
    return {
      x: this.x + 2,
      y: this.y + 2,
      width: this.width - 4,
      height: this.height - 4
    };
  }
}
