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
async function initLevelSystem() {
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

    await setLevelFolder(folder);
  });

  // 尝试加载上次保存的文件夹
  const savedFolder = localStorage.getItem('levelFolder');
  if (savedFolder) {
    await setLevelFolder(savedFolder);
  }

  console.log('[Level] 关卡系统已初始化');
}

/**
 * 设置关卡文件夹
 */
async function setLevelFolder(folder) {
  // 显示路径
  document.getElementById('folderPath').textContent = folder;
  
  // 创建仓库并加载关卡
  currentRepo = new LevelRepository(folder);
  levelSelectView.setRepository(currentRepo);
  
  // 保存到全局供编辑器使用
  window.currentRepo = currentRepo;
  
  // 持久化保存
  localStorage.setItem('levelFolder', folder);
  
  console.log('[Level] 已设置关卡文件夹:', folder);
}

/**
 * 显示自定义输入对话框（替代 prompt）
 */
function showInputDialog(title, placeholder = '') {
  return new Promise((resolve) => {
    const dialog = document.getElementById('inputDialog');
    const titleEl = document.getElementById('inputDialogTitle');
    const inputEl = document.getElementById('inputDialogField');
    const confirmBtn = document.getElementById('inputDialogConfirm');
    const cancelBtn = document.getElementById('inputDialogCancel');
    
    titleEl.textContent = title;
    inputEl.value = '';
    inputEl.placeholder = placeholder;
    dialog.classList.add('active');
    inputEl.focus();
    
    const cleanup = () => {
      dialog.classList.remove('active');
      confirmBtn.onclick = null;
      cancelBtn.onclick = null;
      inputEl.onkeydown = null;
    };
    
    confirmBtn.onclick = () => {
      cleanup();
      resolve(inputEl.value.trim());
    };
    
    cancelBtn.onclick = () => {
      cleanup();
      resolve(null);
    };
    
    inputEl.onkeydown = (e) => {
      if (e.code === 'Enter') {
        cleanup();
        resolve(inputEl.value.trim());
      } else if (e.code === 'Escape') {
        cleanup();
        resolve(null);
      }
    };
  });
}

/**
 * 统一保存关卡（有仓库则保存到仓库，无仓库则导出 JSON）
 */
async function saveLevel() {
  console.log('[saveLevel] 开始执行');
  try {
    if (!game.editor) {
      alert('编辑器未初始化');
      return;
    }

    const levelData = game.editor.exportLevel();
    console.log('[saveLevel] levelData:', levelData);

    if (window.currentRepo) {
      // 有仓库：保存到仓库
      const name = await showInputDialog('请输入关卡名称', 'My Level');
      if (!name) return;

      // 添加元数据
      levelData.meta = {
        name: name,
        author: '',
        version: '1.0',
        createdAt: new Date().toISOString()
      };

      const success = await window.currentRepo.saveLevel(name, levelData);
      if (success) {
        alert('关卡已保存到仓库！');
        levelSelectView?.refresh();
      }
    } else {
      // 无仓库：导出 JSON 到剪贴板
      const json = JSON.stringify(levelData, null, 2);
      
      if (navigator.clipboard) {
        navigator.clipboard.writeText(json);
        alert('关卡 JSON 已复制到剪贴板！\n\n若要保存到本地仓库，请先在主菜单按 R 选择关卡文件夹。');
      } else {
        console.log('[Level] 导出关卡：', json);
        alert('请查看控制台获取关卡 JSON');
      }
    }
  } catch (e) {
    console.error('[saveLevel] 错误:', e);
    alert('保存失败: ' + e.message);
  }
}

// 暴露给全局供编辑器调用
window.saveLevel = saveLevel;

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

// ========== 启动 ==========

initLevelSystem();
game.loop(0);
