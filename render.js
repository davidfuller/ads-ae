const ipcRenderer = require("electron").ipcRenderer;
const tc = require("./timecode.js")
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
  let pageNumber = document.querySelector(".pageNo").value;
  await playoutPage(pageNumber);
}

async function playoutPage(pageNumber){
  let temp = await command.playoutPageNumber(pageNumber, currentConfig);      
  console.log(temp);
  currentPlayoutDetails.startTimecode = temp.theCommand.timecodeStart;
  currentPlayoutDetails.pageNumber = temp.theCommand.pageNumber;
  currentPlayoutDetails.playoutEnd = temp.theCommand.playoutEnd;
  ipcRenderer.send('sendMessage','Cueing Page ');
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

async function readThePages(){
  ipcRenderer.send('sendMessage','Reading Pages');
  await fillListbox();
  ipcRenderer.send('sendMessage','Idle');

  let pageBlock = document.getElementById("page-block");
  pageBlock.style.display = "block";

}

async function selectPage(){
  var e = document.getElementById("pageChoice");
  var value = e.options[e.selectedIndex].value;
  var text = e.options[e.selectedIndex].text;
  await playoutPage(value);
}
let currentPlayoutDetails = {}
currentPlayoutDetails.startTimecode = ""

function getTime(){
  let theTime =tc.nowAsTimecode();
  if (currentPlayoutDetails.startTimecode != ''){
    let currentTime = tc.nowAsTimecode();
    if (tc.timecodeGreaterThan(currentTime, currentPlayoutDetails.startTimecode)){
      if (tc.timecodeGreaterThan(currentTime, currentPlayoutDetails.playoutEnd)){
        theTime = currentTime
        ipcRenderer.send('sendMessage','Idle');
      } else {
        theTime = tc.timecodeSubtract(currentTime, currentPlayoutDetails.startTimecode)
        ipcRenderer.send('sendMessage','Playing Out Page ' + currentPlayoutDetails.pageNumber);  
      }
    } else {
      theTime = tc.timecodeSubtract(currentPlayoutDetails.startTimecode, currentTime)
      ipcRenderer.send('sendMessage','Cueing Page ' + currentPlayoutDetails.pageNumber);
    }
  }
  const clockTag = document.querySelector("#clock");
  clockTag.innerText = theTime;
}
setInterval(getTime, 40 );



