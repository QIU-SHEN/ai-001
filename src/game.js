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

      // 如果有音频，保存音频文件到仓库
      if (levelData.audio && window.audioPlayer && window.audioPlayer.file) {
        try {
          const audioFileName = name.replace(/[<>:"/\\|?*]/g, '_') + '_audio' + 
                                window.audioPlayer.fileName.substring(window.audioPlayer.fileName.lastIndexOf('.'));
          
          // 读取音频文件为 ArrayBuffer
          const arrayBuffer = await window.audioPlayer.file.arrayBuffer();
          
          // 保存音频文件
          await window.electronAPI.saveAudioFile(window.currentRepo.folderPath, audioFileName, arrayBuffer);
          
          // 更新音频路径为相对路径
          levelData.audio.file = audioFileName;
          delete levelData._audioUrl;
          
          console.log('[saveLevel] 音频文件已保存:', audioFileName);
        } catch (audioErr) {
          console.error('[saveLevel] 保存音频文件失败:', audioErr);
          alert('警告: 音频文件保存失败，关卡将不包含音频');
          delete levelData.audio;
        }
      } else {
        delete levelData.audio;
        delete levelData._audioUrl;
      }

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
  const progressBar = document.getElementById('audioProgressBar');
  const progressFill = document.getElementById('audioProgressFill');
  
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
  
  // 一键清空按钮 - 删除编辑器中所有障碍
  clearBtn.onclick = () => {
    if (game.editor) {
      game.editor.state.events = [];
      game.editor.state.selectedEventId = null;
      game.editor.timeline.render();
      game.editor.updateInfo();
      console.log('[Editor] 已清空所有障碍');
    }
  };
  
  // 键盘添加障碍（只在编辑器模式下有效）
  document.addEventListener('keydown', (e) => {
    // 只在编辑器模式下响应
    if (!game.showEditorUI || !game.editor) return;
    
    // 空格键 - 添加 low 障碍
    if (e.code === 'Space') {
      e.preventDefault();
      
      const time = audioPlayer.getCurrentTime();
      const event = {
        id: 'e' + Date.now() + Math.random().toString(36).substr(2, 5),
        time: Math.floor(time),
        type: 'low',
        xOffset: 0
      };
      
      game.editor.addEvent(event);
      console.log('[Editor] 空格添加 low 障碍:', event.time + 'ms');
    }
    
    // S键 - 添加 air 障碍
    if (e.code === 'KeyS') {
      e.preventDefault();
      
      const time = audioPlayer.getCurrentTime();
      const event = {
        id: 'e' + Date.now() + Math.random().toString(36).substr(2, 5),
        time: Math.floor(time),
        type: 'air',
        xOffset: 0
      };
      
      game.editor.addEvent(event);
      console.log('[Editor] S键添加 air 障碍:', event.time + 'ms');
    }
  });
  
  // 更新时间显示和进度条
  function updateTime() {
    let time, duration;
    
    // 判断当前使用哪个音频源
    if (game.showEditorUI) {
      // 编辑器模式：使用编辑器音频播放器
      time = audioPlayer.getCurrentTime();
      duration = audioPlayer.getDuration();
      timeDisplay.textContent = Math.floor(time) + ' ms';
    } else if (game.levelAudio && game.useAudioTime) {
      // 关卡模式：使用关卡背景音乐
      time = game.levelTime;
      duration = game.levelAudio.duration * 1000;
      timeDisplay.textContent = Math.floor(time) + ' ms';
    } else {
      // 无尽模式或其他：不显示进度
      audioUpdateId = requestAnimationFrame(updateTime);
      return;
    }
    
    // 更新进度条（拖动时不覆盖）
    if (duration > 0 && !isDraggingProgress) {
      const percent = Math.min(100, Math.max(0, (time / duration) * 100));
      progressBar.max = duration;
      progressBar.value = time;
      progressFill.style.width = percent + '%';
    }
    
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
  
  // 进度条拖动（只在编辑器模式启用）
  let isDraggingProgress = false;
  
  progressBar.addEventListener('mousedown', (e) => {
    if (!game.showEditorUI) {
      e.preventDefault();
      return;
    }
    isDraggingProgress = true;
  });
  
  progressBar.addEventListener('mouseup', () => {
    isDraggingProgress = false;
  });
  
  progressBar.addEventListener('mouseleave', () => {
    isDraggingProgress = false;
  });
  
  // 拖动过程中只更新UI，不跳转音频
  progressBar.addEventListener('input', () => {
    if (!game.showEditorUI) return;
    
    const time = parseInt(progressBar.value, 10);
    const duration = audioPlayer.getDuration();
    
    // 同步更新填充条
    if (duration > 0) {
      progressFill.style.width = (time / duration) * 100 + '%';
    }
  });
  
  // 拖动结束最终确认，跳转音频
  progressBar.addEventListener('change', () => {
    const time = parseInt(progressBar.value, 10);
    
    // 跳转音频
    if (audioPlayer) {
      audioPlayer.seek(time);
    }
    
    // 延迟清除标志，确保 seek 生效
    setTimeout(() => {
      isDraggingProgress = false;
    }, 100);
  });
  
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
