// ============================================
// Preload - 安全暴露 Electron API 到渲染进程
// ============================================
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 选择关卡文件夹
  selectLevelFolder: () => ipcRenderer.invoke('select-level-folder'),
  
  // 文件系统操作（通过主进程代理，保证安全）
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  readDir: (dirPath) => ipcRenderer.invoke('read-dir', dirPath),
  fileExists: (filePath) => ipcRenderer.invoke('file-exists', filePath),
  pathJoin: (...paths) => ipcRenderer.invoke('path-join', ...paths),
  pathBasename: (filePath, ext) => ipcRenderer.invoke('path-basename', filePath, ext)
});
