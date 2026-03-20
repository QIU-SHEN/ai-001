const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  console.log('[Main] Creating window...');
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.ico')
  });

  console.log('[Main] Loading index.html...');
  mainWindow.loadFile('index.html');
  
  // 开发者工具（调试时启用）
  // mainWindow.webContents.openDevTools();
  
  // 监听加载完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Page loaded successfully');
  });
  
  // 监听加载失败
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Failed to load:', errorCode, errorDescription);
  });
  
  console.log('[Main] Window created');
}

// 注册 IPC 处理器
function registerIpcHandlers() {
  // 选择关卡文件夹
  ipcMain.handle('select-level-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择关卡文件夹'
    });

    if (result.canceled) return null;
    return result.filePaths[0];
  });

  // 读取文件
  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      throw new Error(`读取文件失败: ${e.message}`);
    }
  });

  // 写入文件
  ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
      fs.writeFileSync(filePath, data, 'utf-8');
      return true;
    } catch (e) {
      throw new Error(`写入文件失败: ${e.message}`);
    }
  });

  // 读取目录
  ipcMain.handle('read-dir', async (event, dirPath) => {
    try {
      return fs.readdirSync(dirPath);
    } catch (e) {
      throw new Error(`读取目录失败: ${e.message}`);
    }
  });

  // 检查文件是否存在
  ipcMain.handle('file-exists', async (event, filePath) => {
    return fs.existsSync(filePath);
  });

  // 路径拼接
  ipcMain.handle('path-join', async (event, ...paths) => {
    return path.join(...paths);
  });

  // 获取文件名
  ipcMain.handle('path-basename', async (event, filePath, ext) => {
    return path.basename(filePath, ext);
  });
}

// ========== App 生命周期 ==========

app.whenReady().then(() => {
  // 注册 IPC 处理器
  registerIpcHandlers();
  
  // 创建窗口
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
