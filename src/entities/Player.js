// ============================================
// Player
// ============================================
import { 
  GROUND_Y, PLAYER_X, GRAVITY_UP, GRAVITY_DOWN, 
  JUMP_FORCE, JUMP_FORCE_SECOND, COYOTE_TIME, INPUT_BUFFER,
  PERFECT_JUMP_MIN, PERFECT_JUMP_MAX
} from '../core/Constants.js';
import { TrailSystem } from '../systems/TrailSystem.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.width = 36;
    this.height = 60;
    this.normalHeight = 60;
    this.slideHeight = 30;
    this.x = PLAYER_X;
    this.y = GROUND_Y - this.height;
    this.vy = 0;
    
    this.isGrounded = true;
    this.wasGrounded = true; // 上一帧是否在地面上（用于落地检测）
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 45;
    
    this.jumpCount = 0;
    this.lastJumpCount = 0; // 记录起跳前的跳跃次数
    this.canCoyote = false;
    this.coyoteTimer = 0;
    this.bufferTimer = 0;
    
    this.trail = new TrailSystem();
  }
  
  jump() {
    const canJump = this.isGrounded || this.canCoyote || this.jumpCount < 2;
    
    if (canJump) {
      // 起跳瞬间检测完美跳跃 - 检查前方障碍物
      this.checkPerfectJumpTiming();
      
      // Second jump is weaker
      const force = this.jumpCount === 0 ? JUMP_FORCE : JUMP_FORCE_SECOND;
      this.vy = force;
      this.isGrounded = false;
      this.canCoyote = false;
      this.jumpCount++;
      this.lastJumpCount = this.jumpCount; // 记录跳跃次数用于落地检测
      
      // Cancel slide on jump
      if (this.isSliding) {
        this.isSliding = false;
        this.height = this.normalHeight;
      }
      
      this.game.audio.playJump();
      this.game.particles.spawnDust(this.x + this.width / 2, this.y + this.height);
      return true;
    }
    return false;
  }
  
  checkPerfectJumpTiming() {
    // 获取所有障碍物
    const obstacles = this.game.obstacles.obstacles;
    const playerRight = this.x + this.width;
    
    // 找到前方最近的障碍物（在玩家右侧的）
    let nearestObs = null;
    let minDistance = Infinity;
    
    for (const obs of obstacles) {
      const obsLeft = obs.x;
      const distance = obsLeft - playerRight;
      
      // 只考虑在前方的障碍物（距离为正）
      if (distance > 0 && distance < minDistance) {
        minDistance = distance;
        nearestObs = obs;
      }
    }
    
    // 如果最近障碍物在完美窗口范围内（20-40像素），触发完美跳跃
    if (nearestObs && minDistance > PERFECT_JUMP_MIN && minDistance < PERFECT_JUMP_MAX) {
      this.game.triggerPerfectJump();
    }
  }
  
  bufferJump() {
    this.bufferTimer = INPUT_BUFFER;
  }
  
  startSlide() {
    if (this.isGrounded && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = this.slideDuration;
      this.height = this.slideHeight;
      this.y = GROUND_Y - this.height;
    }
  }
  
  stopSlide() {
    this.isSliding = false;
    this.height = this.normalHeight;
    this.y = GROUND_Y - this.height;
  }
  
  update(input, timeScale) {
    // Handle slide timer
    if (this.isSliding) {
      this.slideTimer -= timeScale;
      if (this.slideTimer <= 0) this.stopSlide();
    }
    
    // Apply gravity (asymmetric)
    const gravity = this.vy < 0 ? GRAVITY_UP : GRAVITY_DOWN;
    this.vy += gravity * timeScale;
    this.y += this.vy * timeScale;
    
    // 记录上一帧的地面状态（用于落地检测）
    this.wasGrounded = this.isGrounded;
    
    // Ground collision
    if (this.y >= GROUND_Y - this.height) {
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.isGrounded = true;
      
      // 落地检测 - 如果上一帧不在地面，这一帧在地面上
      if (!this.wasGrounded) {
        const isDoubleJumpLanding = this.lastJumpCount >= 2;
        this.game.particles.spawnLandDust(
          this.x + this.width / 2, 
          this.y + this.height,
          isDoubleJumpLanding
        );
        // 二段跳落地触发屏幕震动
        if (isDoubleJumpLanding) {
          this.game.triggerShake(3);
        }
      }
      
      this.jumpCount = 0;
      this.lastJumpCount = 0;
      
      // Try buffered jump
      if (this.bufferTimer > 0) {
        this.jump();
        this.bufferTimer = 0;
      }
    } else {
      // Left ground - start coyote time
      if (this.isGrounded) {
        this.isGrounded = false;
        this.canCoyote = true;
        this.coyoteTimer = COYOTE_TIME;
      }
    }
    
    // Update coyote timer
    if (this.canCoyote) {
      this.coyoteTimer -= timeScale;
      if (this.coyoteTimer <= 0) {
        this.canCoyote = false;
        if (this.jumpCount === 0) this.jumpCount = 1;
      }
    }
    
    // Update buffer timer
    if (this.bufferTimer > 0) {
      this.bufferTimer -= timeScale;
      if (this.bufferTimer <= 0) this.bufferTimer = 0;
    }
    
    // Handle input
    // 跳跃：触发式（按一下跳一下）
    if (input.jumpPressed) {
      input.jumpPressed = false; // 立即消费跳跃信号，防止重复
      if (!this.jump()) {
        this.bufferJump();
      }
    }
    
    // 滑步：按一下自动滑步0.8秒
    if (input.slidePressed && input.slideTimer > 0) {
      if (!this.isSliding) {
        this.startSlide();
      }
      // 每帧减少滑步计时
      input.slideTimer -= timeScale;
    }
    // 滑步计时结束，自动停止
    if (this.isSliding && input.slideTimer <= 0) {
      this.stopSlide();
      input.slidePressed = false;
    }
    
    // Update trail
    this.trail.update(this.x, this.y);
  }
  
  draw(ctx) {
    // Draw trail
    this.trail.draw(ctx, this.game.currentSpeed, !this.isGrounded);
    
    ctx.save();
    
    // 有护盾时倾斜10度表示冲锋状态
    if (this.game.immunityCount > 0) {
      const centerX = this.x + this.width / 2;
      const centerY = this.y + this.height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate(-10 * Math.PI / 180); // 逆时针倾斜10度
      ctx.translate(-centerX, -centerY);
    }
    
    // Draw player (minimalist style)
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x, this.y, this.width, this.height);
    
    // Inner detail
    ctx.fillStyle = '#888';
    ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, this.height - 8);
    
    // Slide indicator
    if (this.isSliding) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.x - 6, this.y, 4, this.height);
    }
    
    ctx.restore();
  }
  
  getBounds() {
    return {
      x: this.x + 4,
      y: this.y + 4,
      width: this.width - 8,
      height: this.height - 8
    };
  }
  
  reset() {
    this.y = GROUND_Y - this.normalHeight;
    this.vy = 0;
    this.isGrounded = true;
    this.isSliding = false;
    this.height = this.normalHeight;
    this.jumpCount = 0;
    this.trail.clear();
  }
}
