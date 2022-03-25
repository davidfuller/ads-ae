
const settings = require('./settings');
const ipcRenderer = require("electron").ipcRenderer;

let userPath;
let theSettings;
let jsonFolder = document.getElementById("page-json-folder");

ipcRenderer.send("getUserPathSettings");
ipcRenderer.on("userPath", async (event,data) => {
  userPath = data;
  console.log(userPath);
  theSettings = await settings.readSettings(userPath);
  console.log(theSettings)
  let ip = document.getElementById("stream-master-ip");
  ip.value = theSettings.streamMaster.ip
  jsonFolder.value = theSettings.pageWorkDetailsFolderUNC
})


function getJsonPlayoutFolder(){
  ipcRenderer.send("getSettingsFolderDialog");
}

ipcRenderer.on("folderChoice", (event, folderStuff) => {
  if (!folderStuff.canceled){
    if (folderStuff.filePaths.length > 0){
      jsonFolder.value = folderStuff.filePaths[0];
      theSettings.pageWorkDetailsFolderUNC = folderStuff.filePaths[0];
      settings.saveSettings(theSettings, userPath);
    }
  }
})