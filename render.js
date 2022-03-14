const ipcRenderer = require("electron").ipcRenderer;
const command = require("./command.js")

const workDetailsFilenameUNC ='\\\\alpaca\\dropbox\\Development\\Node\\StreamMasterHelper\\JSON\\workDetails.json'
const mediaProfilesFilename = '/Users/David/Dropbox/Development/Node/StreamMasterHelper/config/media_profiles.xml';
const configFilename = '/Users/David/Dropbox/Development/Node/StreamMasterHelper/config/config.xml';

const playoutSubDevice = 1;
const renderSubDevice = 2;

/**
 * @type {CurrentConfig}
*/
let currentConfig = {
  mediaProfilesFilename: mediaProfilesFilename,
  configFilename: configFilename,
  renderSubDevice: renderSubDevice,
  playoutSubDevice: playoutSubDevice,
  triggerFirstId: '0',
  triggerLastId: '4294967295'
}


ipcRenderer.on("receiveMessage", (event, data) => {
  const passwordTag = document.querySelector("#status");
  passwordTag.innerText = data;
});

async function showBlack(){
    let result = [];
    result = await command.playBlack('black', 1 , true, '');
    console.log(result);
    ipcRenderer.send('sendMessage','Showing Black');
}

async function showTestSignal(){
    let result = [];
    result = await command.playTest('test', 1, true, '');
    console.log(result);
    ipcRenderer.send('sendMessage','Showing Test Signal');
}

async function playoutPageWorkfileOverTest(){
    //Playout Page and Background from Workfile
    let temp = await command.playOutOverTest(workDetailsFilenameUNC, currentConfig);      
    console.log(temp);
    /*
    theCommand = temp.theCommand;
    result = temp.result;
    */
    ipcRenderer.send('sendMessage','Playing Out Page Over Test');
}
async function playoutPageWorkfile(){
  //Playout Page and Background from Workfile
  let temp = await command.playOut(workDetailsFilenameUNC, currentConfig);      
  console.log(temp);
  /*
  theCommand = temp.theCommand;
  result = temp.result;
  */
  ipcRenderer.send('sendMessage','Playing Out Page');
}

async function playoutPageNumber(){
  //Playout Page and Background from pageNumber
  let pageNumber = document.querySelector(".pageNo").value
  let temp = await command.playoutPageNumber(pageNumber, currentConfig);      
  console.log(temp);
  /*
  theCommand = temp.theCommand;
  result = temp.result;
  */
  ipcRenderer.send('sendMessage','Playing Out Page');
}

async function playoutPageNumberOverTest(){
  //Playout Page from pageNumber over Test
  let pageNumber = document.querySelector(".pageNo").value
  let temp = await command.playoutPageNumberOverTest(pageNumber, currentConfig);      
  console.log(temp);
  /*
  theCommand = temp.theCommand;
  result = temp.result;
  */
  ipcRenderer.send('sendMessage','Playing Out Page');
}

function getTime(){
  const theTime = new Date().toLocaleTimeString();
  const clockTag = document.querySelector("#clock");
  clockTag.innerText = theTime;
}
setInterval(getTime, 1000 );