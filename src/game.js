// ============================================
// Minimal Endless Runner - Entry Point
// 集成本地关卡仓库系统 + 音频控制
// ============================================
import { Game } from './core/Game.js';
import { LevelRepository } from './core/LevelRepository.js';
import { LevelLoader } from './core/LevelLoader.js';
import { LevelSelectView } from './ui/LevelSelectView.js';
import { AudioPlayer } from './audio/AudioPlayer.js';
import { BeatRecorder } from './editor/BeatRecorder.js';

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

// ========== 音频控制 ==========

const audioPlayer = new AudioPlayer();
window.audioPlayer = audioPlayer; // 暴露到全局供编辑器使用
let audioUpdateId = null;

/**
 * 初始化音频控制（在编辑器模式下显示）
 */
function initAudioControl() {
  const audioPanel = document.getElementById('audioPanel');
  const fileInput = document.getElementById('audioFile');
  const playBtn = document.getElementById('playBtn');
  const timeDisplay = document.getElementById('timeDisplay');
  const fileNameDisplay = document.getElementById('audioFileName');
  const clearBtn = document.getElementById('clearBeatsBtn');
  
  // 创建打点记录器
  const recorder = new BeatRecorder(audioPlayer);
  window.beatRecorder = recorder; // 暴露到全局供调试
  
  // 同步事件到编辑器时间轴
  function syncEventsToEditor() {
    if (game.editor) {
      game.editor.syncFromRecorder(recorder.getEvents());
    }
  }
  
  // 设置打点记录器回调
  recorder.onEventAdded = () => {
    syncEventsToEditor();
  };
  
  recorder.onEventsCleared = () => {
    syncEventsToEditor();
  };
  
  // 加载文件
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      audioPlayer.loadFile(file);
      fileNameDisplay.textContent = file.name;
      playBtn.disabled = false;
    }
  };
  
  // 播放/暂停按钮
  playBtn.onclick = () => {
    audioPlayer.toggle();
    updatePlayButton();
  };
  
  // 清空打点按钮
  clearBtn.onclick = () => {
    if (confirm('确定要清空所有打点事件吗？')) {
      recorder.clear();
    }
  };
  
  // 键盘打点（只在编辑器模式下有效）
  document.addEventListener('keydown', (e) => {
    // 只在编辑器模式下响应
    if (!game.showEditorUI) return;
    
    // 空格键 - 记录 low
    if (e.code === 'Space') {
      e.preventDefault(); // 防止页面滚动
      const event = recorder.recordBeat('low');
      if (event) {
        console.log('[Beat] 空格打点:', event.time + 'ms');
      }
    }
    
    // S键 - 记录 air
    if (e.code === 'KeyS') {
      e.preventDefault();
      const event = recorder.recordBeat('air');
      if (event) {
        console.log('[Beat] S键打点:', event.time + 'ms');
      }
    }
  });
  
  // 更新时间显示
  function updateTime() {
    const time = audioPlayer.getCurrentTime();
    timeDisplay.textContent = Math.floor(time) + ' ms';
    audioUpdateId = requestAnimationFrame(updateTime);
  }
  
  // 更新按钮文字
  function updatePlayButton() {
    playBtn.textContent = audioPlayer.isPlaying() ? '暂停' : '播放';
  }
  
  // 音频结束时重置按钮
  audioPlayer.onEnded = () => {
    updatePlayButton();
  };
  
  // 开始时间更新循环
  updateTime();
  
  console.log('[Audio] 音频控制已初始化（含打点功能）');
  
}

/**
 * 显示/隐藏音频面板（由编辑器调用）
 */
window.showAudioPanel = (show) => {
  const audioPanel = document.getElementById('audioPanel');
  
  if (show) {
    audioPanel.classList.add('active');
  } else {
    audioPanel.classList.remove('active');
    // 隐藏时暂停音频
    audioPlayer.pause();
  }
};

// ========== 启动 ==========

initLevelSystem();
initAudioControl();
game.loop(0);
