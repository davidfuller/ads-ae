const {app, BrowserWindow, ipcMain, Menu, dialog} =  require('electron');
const path = require('path')

let win = null;


const createWindow = () => {
    win = new BrowserWindow({
      width: 1200,
      height: 1300,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      }
    })
  
    win.loadFile('index.html')
    win.webContents.send("refreshPages");
  }
  app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
    const theMenu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(theMenu);
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  ipcMain.on("sendMessage", (event, data) => {
    const myMessage = data;
    win.webContents.send("receiveMessage", myMessage);
  });

ipcMain.on("getUserPath", (event, data) =>{
  win.webContents.send("userPath", app.getPath("userData"))
})

ipcMain.on("getSettings", () => {
  win.webContents.send("receiveSettings");  
})

function refreshThePages(){
  win.webContents.send("refreshPages");
}

function reloadThePages(){
  win.webContents.send("reloadPages");
}

function settings(){
  win.webContents.send("receiveSettings");
}

const template = [
  {
    label: 'File',
    submenu: [
      {label: 'Refresh Pages', click(){refreshThePages()}},
      {label: 'Reload Pages from Disk', click(){reloadThePages()}},
      {label: 'Settings', click(){openSettingsWindow()}},
      {role: 'quit'}
    ]
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'toggleDevTools'}
    ]
  }
]

var newWindow = null

function openSettingsWindow() {
  if (newWindow) {
    newWindow.focus()
    return
  }

  newWindow = new BrowserWindow({
    height: 1000,
    resizable: false,
    width: 1000,
    title: '',
    minimizable: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  newWindow.loadFile('settings.html')

  newWindow.on('closed', function() {
    newWindow = null
  })
}

ipcMain.on("getUserPathSettings", (event, data) =>{
  newWindow.webContents.send("userPath", app.getPath("userData"));
})

ipcMain.on("getSettingsFolderDialog", async (event, data) => {
  let theFolder = await dialog.showOpenDialog(newWindow, {properties: ['openDirectory']} );
  newWindow.webContents.send("folderChoice", theFolder);
})

ipcMain.on("getFolderDialog", async (event, data) => {
  let theFolder = await dialog.showOpenDialog(win, {properties: ['openDirectory']} );
  win.webContents.send("folderChoice", theFolder);
})