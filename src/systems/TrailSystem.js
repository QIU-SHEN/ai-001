// ============================================
// Trail System
// ============================================
import { MAX_SPEED } from '../core/Constants.js';

export class TrailSystem {
  constructor(length = 12) {
    this.history = [];
    this.maxLength = length;
  }
  
  update(x, y) {
    this.history.push({ x, y });
    if (this.history.length > this.maxLength) {
      this.history.shift();
    }
  }
  
  draw(ctx, speed, isJumping) {
    if (this.history.length < 2) return;
    
    const speedFactor = Math.min(speed / MAX_SPEED, 1);
    const effectiveLength = Math.floor(this.history.length * (0.4 + speedFactor * 0.6));
    const baseOffset = 6 + speedFactor * 10;
    const jumpBoost = isJumping ? 1.2 : 1;
    
    const startIdx = Math.max(0, this.history.length - effectiveLength);
    
    for (let i = startIdx; i < this.history.length; i++) {
      const point = this.history[i];
      const reverseIndex = effectiveLength - (i - startIdx);
      const offsetX = speed * baseOffset * 0.12 * reverseIndex * jumpBoost;
      const normalizedIndex = reverseIndex / effectiveLength;
      const alpha = Math.pow(normalizedIndex, 2) * 0.35 * (0.5 + speedFactor * 0.5);
      
      if (alpha < 0.02) continue;
      
      ctx.fillStyle = `rgba(150,150,150,${alpha})`;
      ctx.fillRect(point.x - offsetX, point.y, 32, 52);
    }
  }
  
  clear() {
    this.history = [];
  }
}
