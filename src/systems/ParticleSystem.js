// ============================================
// Particle System (Object Pool)
// ============================================
class Particle {
  constructor() { this.active = false; }
  
  spawn(x, y, vx, vy, life, size, color = null) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life; this.size = size;
    this.color = color;
    this.active = true;
  }
  
  update(timeScale) {
    if (!this.active) return;
    this.x += this.vx * timeScale;
    this.y += this.vy * timeScale;
    this.vy += 0.2 * timeScale;
    this.life -= timeScale;
    if (this.life <= 0) this.active = false;
  }
  
  draw(ctx) {
    if (!this.active) return;
    const alpha = this.life / this.maxLife;
    if (this.color) {
      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
    } else {
      ctx.fillStyle = `rgba(200,200,200,${alpha * 0.6})`;
    }
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

export class ParticleSystem {
  constructor(count = 100) {
    this.particles = Array.from({ length: count }, () => new Particle());
  }
  
  spawn(x, y, vx, vy, life, size, color = null) {
    const p = this.particles.find(p => !p.active);
    if (p) p.spawn(x, y, vx, vy, life, size, color);
  }
  
  spawnDust(x, y) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5);
      const speed = 1 + Math.random() * 2;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 20 + Math.random() * 10, 2);
    }
  }
  
  spawnExplosion(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 5;
      this.spawn(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, 40 + Math.random() * 20, 3);
    }
  }
  
  spawnPerfectExplosion(x, y) {
    // 轻微强化粒子效果 - 比普通跳跃稍强但不夸张
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 4;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, vx, vy, 40 + Math.random() * 20, 3);
    }
  }
  
  spawnComboExplosion(x, y, tier) {
    // Combo 升级粒子效果（根据等级增加粒子数量）
    const count = 15 + tier * 5;
    const colors = ['#fff', '#ff0', '#0ff', '#f0f'];
    const color = colors[Math.min(tier, colors.length - 1)];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 4 + Math.random() * 3 + tier;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, vx, vy, 50 + Math.random() * 30, 4, color);
    }
  }
  
  spawnShieldBreak(x, y) {
    // 护盾破碎效果
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      this.spawn(x, y, vx, vy, 60, 5, '#0ff');
    }
  }
  
  spawnLandDust(x, y, isDoubleJump) {
    // 落地灰尘效果
    const count = isDoubleJump ? 12 : 6;
    const speed = isDoubleJump ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.5; // 向上扇形
      const vx = Math.cos(angle) * speed * Math.random();
      const vy = Math.sin(angle) * speed * Math.random();
      this.spawn(x, y, vx, vy, 30 + Math.random() * 20, 2, '#888');
    }
  }
  
  update(timeScale) {
    this.particles.forEach(p => p.update(timeScale));
  }
  
  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
  }
  
  clear() {
    this.particles.forEach(p => p.active = false);
  }
}
