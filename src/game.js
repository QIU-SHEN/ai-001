// ============================================
// Minimal Endless Runner - Entry Point
// 集成本地关卡仓库系统
// ============================================
import { Game } from './core/Game.js';
import { LevelRepository } from './core/LevelRepository.js';
import { LevelLoader } from './core/LevelLoader.js';
import { LevelSelectView } from './ui/LevelSelectView.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

// 暴露 game 实例供关卡系统使用
window.game = game;

// ========== 关卡仓库系统 ==========

let currentRepo = null;
let levelSelectView = null;

/**
 * 初始化关卡选择系统
 */
function initLevelSystem() {
  // 创建关卡选择视图
  levelSelectView = new LevelSelectView('levelList', game);
  
  // 关卡选择后的回调
  levelSelectView.onLevelSelect = (name, data) => {
    console.log('[Level] 已加载关卡:', name);
    // 隐藏关卡选择面板，专注于游戏
    document.getElementById('levelSelectPanel').classList.remove('active');
  };

  // 选择文件夹按钮
  document.getElementById('btnSelectFolder').addEventListener('click', async () => {
    const folder = await window.electronAPI.selectLevelFolder();
    if (!folder) return;

    // 显示路径
    document.getElementById('folderPath').textContent = folder;
    
    // 创建仓库并加载关卡
    currentRepo = new LevelRepository(folder);
    levelSelectView.setRepository(currentRepo);
    
    // 保存到全局供编辑器使用
    window.currentRepo = currentRepo;
    
    console.log('[Level] 已选择关卡文件夹:', folder);
  });

  console.log('[Level] 关卡系统已初始化');
}

/**
 * 编辑器保存关卡到仓库
 */
async function saveLevelToRepo() {
  if (!window.currentRepo) {
    alert('请先选择关卡文件夹');
    return;
  }

  if (!game.editor) {
    alert('编辑器未初始化');
    return;
  }

  const name = prompt('请输入关卡名称');
  if (!name) return;

  const levelData = game.editor.exportLevel();
  
  // 添加元数据
  levelData.meta = {
    name: name,
    author: '',
    version: '1.0',
    createdAt: new Date().toISOString()
  };

  const success = await window.currentRepo.saveLevel(name, levelData);
  if (success) {
    alert('关卡已保存！');
    // 刷新列表
    levelSelectView?.refresh();
  }
}

// 暴露给全局供编辑器调用
window.saveLevelToRepo = saveLevelToRepo;

// ========== 主菜单扩展：R 键打开关卡选择面板 ==========

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR' && game.state === 'start' && !game.showEditorUI) {
    e.preventDefault();
    const panel = document.getElementById('levelSelectPanel');
    panel.classList.toggle('active');
    
    if (panel.classList.contains('active')) {
      levelSelectView?.refresh();
    }
  }
});

// ========== 编辑器集成 ==========

// 等待编辑器初始化后绑定保存按钮
const checkEditor = setInterval(() => {
  const saveBtn = document.getElementById('btnSaveToRepo');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveLevelToRepo);
    clearInterval(checkEditor);
    console.log('[Level] 编辑器保存按钮已绑定');
  }
}, 500);

// ========== 启动 ==========

initLevelSystem();
game.loop(0);
