import { contextBridge, ipcRenderer } from 'electron';
import type { AfeApi } from './types.js';

const api: AfeApi = {
  chooseFolder: () => ipcRenderer.invoke('afe:chooseFolder'),
  getRoot: () => ipcRenderer.invoke('afe:getRoot'),
  setRoot: (root) => ipcRenderer.invoke('afe:setRoot', root),
  listDir: (dir) => ipcRenderer.invoke('afe:listDir', dir),
  stat: (p) => ipcRenderer.invoke('afe:stat', p),
  parentDir: (p) => ipcRenderer.invoke('afe:parentDir', p),
  pathSep: () => ipcRenderer.invoke('afe:pathSep'),
  joinPath: (a, b) => ipcRenderer.invoke('afe:joinPath', a, b),
  readFile: (p) => ipcRenderer.invoke('afe:readFile', p),
  readBinaryBase64: (p, maxBytes) => ipcRenderer.invoke('afe:readBinaryBase64', p, maxBytes),
  indexStatus: () => ipcRenderer.invoke('afe:indexStatus'),
  startIndex: () => ipcRenderer.invoke('afe:startIndex'),
  onIndexProgress: (cb) => {
    const listener = (_: unknown, p: Parameters<AfeApi['onIndexProgress']>[0] extends (arg: infer T) => void ? T : never) => cb(p);
    ipcRenderer.on('afe:indexProgress', listener);
    return () => ipcRenderer.removeListener('afe:indexProgress', listener);
  },
  search: (q) => ipcRenderer.invoke('afe:search', q),
  chat: (q) => ipcRenderer.invoke('afe:chat', q),
  summarize: (p) => ipcRenderer.invoke('afe:summarize', p),
  tag: (p) => ipcRenderer.invoke('afe:tag', p),
  similar: (p) => ipcRenderer.invoke('afe:similar', p),
  providerName: () => ipcRenderer.invoke('afe:providerName'),
  getShowHidden: () => ipcRenderer.invoke('afe:getShowHidden'),
  setShowHidden: (v) => ipcRenderer.invoke('afe:setShowHidden', v),
  newFile: (dir, name) => ipcRenderer.invoke('afe:newFile', dir, name),
  newFolder: (dir, name) => ipcRenderer.invoke('afe:newFolder', dir, name),
  rename: (oldPath, newName) => ipcRenderer.invoke('afe:rename', oldPath, newName),
  trash: (paths) => ipcRenderer.invoke('afe:trash', paths),
  copyPaths: (paths, destDir) => ipcRenderer.invoke('afe:copyPaths', paths, destDir),
  movePaths: (paths, destDir) => ipcRenderer.invoke('afe:movePaths', paths, destDir),
  pathExists: (p) => ipcRenderer.invoke('afe:pathExists', p),
  revealInOS: (p) => ipcRenderer.invoke('afe:revealInOS', p),
  getFavorites: () => ipcRenderer.invoke('afe:getFavorites'),
  addFavorite: (p) => ipcRenderer.invoke('afe:addFavorite', p),
  removeFavorite: (p) => ipcRenderer.invoke('afe:removeFavorite', p),
  getRecent: () => ipcRenderer.invoke('afe:getRecent'),
  pushRecent: (p) => ipcRenderer.invoke('afe:pushRecent', p),
  clearRecent: () => ipcRenderer.invoke('afe:clearRecent'),
  getUiSettings: () => ipcRenderer.invoke('afe:getUiSettings'),
  setUiSettings: (patch) => ipcRenderer.invoke('afe:setUiSettings', patch),
  exportSettings: () => ipcRenderer.invoke('afe:exportSettings'),
  importSettings: () => ipcRenderer.invoke('afe:importSettings'),
  resetUiSettings: () => ipcRenderer.invoke('afe:resetUiSettings'),
};

contextBridge.exposeInMainWorld('afe', api);
