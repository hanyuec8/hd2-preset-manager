/* global __static */
'use strict'
import { app, protocol, BrowserWindow, Menu, ipcMain, globalShortcut } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import koffi from 'koffi'
import path from 'path'

let mainWindow;

const user32 = koffi.load('user32.dll');
const keybd_event = user32.func('void keybd_event(uint8 bVk, uint8 bScan, uint32 dwFlags, uintptr dwExtraInfo)');
const VK = { UP: 0x57, DOWN: 0x53, LEFT: 0x41, RIGHT: 0x44, SPACE: 0x20, Z: 0x5A, C: 0x43 };

let isSimulating = false; // 매크로 실행 중 상태 플래그

async function simulateKeySequence(sequence, isLowSpec = false) {
  if (isSimulating) return; // 실행 중이면 무시
  isSimulating = true;

  const waitMTime = isLowSpec ? 60 : 30;
  for (const cmd of sequence) {
    if (cmd === "WAIT_200MS") {
      await new Promise(r => setTimeout(r, 200)); // 🚀 C키 전환 & 보급/방어 선택용 200ms
      continue;
    }
    if (cmd === "WAIT_M") {
      await new Promise(r => setTimeout(r, waitMTime)); // 기본 30ms 또는 저사양 60ms
      continue;
    }

    const vk = VK[cmd];
    if (vk) {
      keybd_event(vk, 0, 0, 0);
      await new Promise(r => setTimeout(r, 30));
      keybd_event(vk, 0, 2, 0);
      await new Promise(r => setTimeout(r, 10));
    }
  }
  isSimulating = false; // 매크로 종료
}

function registerHotkey(key) {
  globalShortcut.unregisterAll();
  try {
    globalShortcut.register(key, () => {
      if (mainWindow && !isSimulating) {
        mainWindow.webContents.send('request-apply-preset');
      }
    });
  } catch (e) { console.error("Hotkey Error:", e); }
}

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { secure: true, standard: true, allowServiceWorkers: true, supportFetchAPI: true, corsEnabled: true } }])

async function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1550, height: 850, minWidth: 1200, minHeight: 700,
    useContentSize: true, resizable: false, maximizable: false, backgroundColor: '#0b0b0b',
    title: "HD2 Preset Manager", show: false,
    icon: path.join(__static, 'icon.ico'),
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false }
  });
  mainWindow.once('ready-to-show', () => { mainWindow.show(); });
  if (process.env.WEBPACK_DEV_SERVER_URL) { await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL) }
  else { createProtocol('app'); mainWindow.loadURL('app://./index.html'); }
}

ipcMain.on('update-hotkey', (event, key) => registerHotkey(key));
ipcMain.on('send-stratagem-input', (event, payload) => {
  let sequence = Array.isArray(payload) ? payload : (payload && payload.sequence ? payload.sequence : []);
  let isLowSpec = payload && payload.isLowSpec ? true : false;
  simulateKeySequence(sequence, isLowSpec);
});
app.on('ready', createWindow);
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });