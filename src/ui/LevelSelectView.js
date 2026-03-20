// ============================================
// LevelSelectView - 关卡选择界面
// ============================================

import { LevelLoader } from '../core/LevelLoader.js';

export class LevelSelectView {
  constructor(containerId, game) {
    this.container = document.getElementById(containerId);
    this.game = game;
    this.repo = null;
    this.levels = [];
    this.onLevelSelect = null; // 回调函数
  }

  /**
   * 设置关卡仓库
   * @param {LevelRepository} repo
   */
  setRepository(repo) {
    this.repo = repo;
    this.refresh();
  }

  /**
   * 刷新关卡列表
   */
  async refresh() {
    if (!this.repo) {
      this.renderEmpty('请先选择关卡文件夹');
      return;
    }

    this.levels = await this.repo.getAllLevels();
    this.render();
  }

  /**
   * 渲染空状态
   */
  renderEmpty(message) {
    this.container.innerHTML = `
      <div class="level-empty">
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * 渲染关卡列表
   */
  render() {
    if (this.levels.length === 0) {
      this.renderEmpty('该文件夹中没有找到关卡 (.json)');
      return;
    }

    this.container.innerHTML = `
      <div class="level-list-header">
        <span>找到 ${this.levels.length} 个关卡</span>
        <button id="btnRefreshLevels" class="btn-small">刷新</button>
      </div>
      <div class="level-list">
        ${this.levels.map((level, index) => `
          <div class="level-item" data-index="${index}">
            <span class="level-name">${this.escapeHtml(level.name)}</span>
            <button class="btn-play">▶ 游玩</button>
          </div>
        `).join('')}
      </div>
    `;

    // 绑定事件
    this.container.querySelector('#btnRefreshLevels')?.addEventListener('click', () => {
      this.refresh();
    });

    this.container.querySelectorAll('.level-item').forEach(item => {
      const index = parseInt(item.dataset.index);
      const level = this.levels[index];

      item.querySelector('.btn-play').addEventListener('click', () => {
        this.loadAndPlay(level);
      });
    });
  }

  /**
   * 加载并游玩关卡
   */
  async loadAndPlay(level) {
    try {
      const data = await this.repo.loadLevel(level.path);
      
      if (!data) {
        alert('关卡加载失败');
        return;
      }

      // 验证关卡
      LevelLoader.validate(data);
      
      // 调用游戏加载
      this.game.loadLevel(data);
      this.game.startLevel();
      
      // 触发回调
      if (this.onLevelSelect) {
        this.onLevelSelect(level.name, data);
      }
      
    } catch (e) {
      console.error('[LevelSelectView] 关卡验证失败:', e);
      alert('关卡格式错误: ' + e.message);
    }
  }

  /**
   * 转义 HTML 特殊字符
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 显示/隐藏
   */
  show() {
    this.container.style.display = 'block';
  }

  hide() {
    this.container.style.display = 'none';
  }
}
