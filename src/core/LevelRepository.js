// ============================================
// LevelRepository - 本地关卡仓库管理
// ============================================

export class LevelRepository {
  constructor(folderPath) {
    this.folderPath = folderPath;
    this.cache = new Map(); // 缓存已加载的关卡
  }

  /**
   * 获取所有关卡列表
   * @returns {Promise<Array<{name: string, path: string}>>}
   */
  async getAllLevels() {
    try {
      const files = await window.electronAPI.readDir(this.folderPath);
      
      const levels = [];
      for (const f of files.filter(f => f.endsWith('.json'))) {
        levels.push({
          name: f.replace('.json', ''),
          path: await window.electronAPI.pathJoin(this.folderPath, f)
        });
      }
      return levels;
    } catch (e) {
      console.error('[LevelRepository] 扫描目录失败:', e);
      return [];
    }
  }

  /**
   * 加载指定关卡
   * @param {string} filePath - 关卡文件路径
   * @returns {Promise<Object|null>}
   */
  async loadLevel(filePath) {
    // 检查缓存
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath);
    }

    try {
      const content = await window.electronAPI.readFile(filePath);
      const data = JSON.parse(content);
      
      // 存入缓存
      this.cache.set(filePath, data);
      return data;
    } catch (e) {
      console.error('[LevelRepository] 加载关卡失败:', filePath, e);
      return null;
    }
  }

  /**
   * 保存关卡到仓库
   * @param {string} name - 关卡名称
   * @param {Object} levelData - 关卡数据
   * @returns {Promise<boolean>}
   */
  async saveLevel(name, levelData) {
    // 清理非法字符
    const safeName = name.replace(/[<>:"/\\|?*]/g, '_');
    const fileName = safeName.endsWith('.json') ? safeName : safeName + '.json';
    const fullPath = await window.electronAPI.pathJoin(this.folderPath, fileName);

    // 检查文件是否已存在
    const exists = await window.electronAPI.fileExists(fullPath);
    if (exists) {
      const overwrite = confirm(`关卡 "${name}" 已存在，是否覆盖？`);
      if (!overwrite) return false;
    }

    try {
      await window.electronAPI.writeFile(fullPath, JSON.stringify(levelData, null, 2));
      
      // 更新缓存
      this.cache.set(fullPath, levelData);
      
      console.log('[LevelRepository] 关卡已保存:', fileName);
      return true;
    } catch (e) {
      console.error('[LevelRepository] 保存关卡失败:', e);
      alert('保存失败: ' + e.message);
      return false;
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}
