// ============================================
// AudioPlayer - 音频控制模块
// ============================================

export class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.audioUrl = null;
    this.isLoaded = false;
    
    // 音频加载完成回调
    this.onLoaded = null;
    this.onEnded = null;
    
    this.bindEvents();
  }
  
  /**
   * 绑定音频事件
   */
  bindEvents() {
    // 音频可以播放时触发
    this.audio.addEventListener('canplay', () => {
      this.isLoaded = true;
      console.log('[AudioPlayer] 音频加载完成，时长:', this.audio.duration * 1000, 'ms');
      if (this.onLoaded) this.onLoaded();
    });
    
    // 音频播放结束时触发
    this.audio.addEventListener('ended', () => {
      console.log('[AudioPlayer] 播放结束');
      if (this.onEnded) this.onEnded();
    });
    
    // 错误处理
    this.audio.addEventListener('error', (e) => {
      console.error('[AudioPlayer] 音频加载失败:', e);
    });
  }
  
  /**
   * 加载音频文件
   * @param {File} file - 从 <input type="file"> 获取的文件对象
   */
  loadFile(file) {
    // 释放之前的 URL，避免内存泄漏
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    
    // 保存文件信息
    this.file = file;
    this.fileName = file.name;
    
    // 创建新的对象 URL
    this.audioUrl = URL.createObjectURL(file);
    this.audio.src = this.audioUrl;
    
    this.isLoaded = false;
    console.log('[AudioPlayer] 开始加载音频:', file.name);
    
    // 触发加载
    this.audio.load();
  }
  
  /**
   * 播放音频
   */
  play() {
    if (!this.isLoaded) {
      console.warn('[AudioPlayer] 音频尚未加载');
      return;
    }
    
    this.audio.play().catch(err => {
      console.error('[AudioPlayer] 播放失败:', err);
    });
  }
  
  /**
   * 暂停音频
   */
  pause() {
    this.audio.pause();
  }
  
  /**
   * 播放/暂停切换
   */
  toggle() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  /**
   * 获取当前播放时间（毫秒）
   * @returns {number} 当前时间（毫秒，整数）
   */
  getCurrentTime() {
    return Math.floor(this.audio.currentTime * 1000);
  }
  
  /**
   * 获取音频总时长（毫秒）
   * @returns {number} 总时长（毫秒，整数）
   */
  getDuration() {
    return Math.floor(this.audio.duration * 1000) || 0;
  }
  
  /**
   * 检查是否正在播放
   * @returns {boolean}
   */
  isPlaying() {
    return !this.audio.paused;
  }
  
  /**
   * 跳转到指定时间（毫秒）
   * @param {number} timeMs - 时间（毫秒）
   */
  seek(timeMs) {
    const timeSec = timeMs / 1000;
    this.audio.currentTime = timeSec;
  }
  
  /**
   * 设置音量
   * @param {number} volume - 0-1 之间的数值
   */
  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * 销毁音频对象（释放资源）
   */
  destroy() {
    this.pause();
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }
    this.audio.src = '';
  }
}
