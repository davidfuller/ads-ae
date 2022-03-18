const ipcRenderer = require("electron").ipcRenderer;
const tc = require("./timecode.js")
const command = require("./command.js")

const workDetailsFilenameUNC ='\\\\alpaca\\dropbox\\Development\\Node\\StreamMasterHelper\\JSON\\workDetails.json'
const mediaProfilesFilename = '/Users/David/Dropbox/Development/Node/StreamMasterHelper/config/media_profiles.xml';
const configFilename = '/Users/David/Dropbox/Development/Node/StreamMasterHelper/config/config.xml';

const playoutSubDevice = 1;
const renderSubDevice = 2;
let pages =[];

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
  ipcRenderer.send('sendMessage','Cueing Page ' + pageNumber);
  let temp = await command.playoutPageNumber(pageNumber, currentConfig);      
  console.log(temp);
  currentPlayoutDetails.startTimecode = temp.theCommand.timecodeStart;
  currentPlayoutDetails.pageNumber = temp.theCommand.pageNumber;
  currentPlayoutDetails.playoutEnd = temp.theCommand.playoutEnd;
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
  pages = await getThePages()
  fillListbox(pages);
  ipcRenderer.send('sendMessage','Idle');
  let pageBlock = document.getElementById("page-block");
  pageBlock.style.display = "block";
  let readPagesButton = document.getElementById("read-pages-btn");
  readPagesButton.style.display = "none";
}

async function refreshPages(){
  fillListbox(pages);
}

async function selectPage(){
  let pageNumber = listboxPageNumber()
  await playoutPage(pageNumber);
}

function listboxPageNumber(){
  var e = document.getElementById("pageChoice");
  return e.options[e.selectedIndex].value;
}

const listbox = document.getElementById('pageChoice')

listbox.addEventListener('keyup', testKey);
 
async function testKey(e){
  if (e.key == "Enter"){
    await selectPage()
  } else if (e.key == "ArrowUp" || e.key == "ArrowDown"){
    await displayJpeg()
    console.log(listboxPageNumber());
  }
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

async function displayJpeg(){
  console.log(pages)
  let thePage = listboxPageNumber();
  let filenameBase = findPageNumber(thePage).jpegFilenameBase;
 
  let jpegNo = 0
  let target = document.getElementById('my-jpeg');
  let jpg64
  do {
    let jpegFilenameUNC = filenameBase + '_' + jpegNo + '.jpg';
    jpg64 = await command.readJpeg(jpegFilenameUNC);
    if (jpegNo == 0){
      if (jpg64 != ''){
        let image = '<img src="data:image/jpg;base64,' + jpg64 + '" ondblclick="playVideo()" />';
        target.innerHTML = image;
        let btn = document.getElementById("toggle-video-jpeg");
        if (btn.style.display == "none"){
          btn.style.display = "block";
          btn.innerText = "Show Video";
        }
      } else {
        target.innerHTML = "No Jpeg"
      }
    } else {
      if (jpg64 == ''){
        break;
      } else {
        let image = '<img src="data:image/jpg;base64,' + jpg64 + '" />';
        target.insertAdjacentHTML('beforeend', image);
      }
    }
    jpegNo += 1;
  } while (jpg64 != '')
  
}

function findPageNumber(pageNumber){
  for(page of pages){
    if (page.txPageNumber == pageNumber){
      return page;
    }
  }
  return null;
}

function toggleVideo(forceVideo){
  let myVideo = document.getElementById("my-video");
  let myJpeg = document.getElementById("my-jpeg");
  let btn = document.getElementById("toggle-video-jpeg");
  btn.style.display = "block";
  if (forceVideo){
    btn.innerText = "Show Jpeg";
    myVideo.style.display = "block";
    myJpeg.style.display = "none";
  } else if (myVideo.style.display == "block"){
    btn.innerText = "Show Video";
    myVideo.style.display = "none";
    myJpeg.style.display = "block";
  } else {
    btn.innerText = "Show Jpeg"
    myVideo.style.display = "block";
    myJpeg.style.display = "none";
  }

}

async function playVideo(){
  let pageNumber = listboxPageNumber();
  let thePage = findPageNumber(pageNumber);
  console.log(thePage);
  let theFiles = await command.readDirectory(thePage.mp4Folder);
  theFiles.sort();
  console.log(theFiles);
  for (theFile of theFiles){
    if (theFile.includes(thePage.mp4FilePattern)){
      console.log(theFile);
      let videoNode = document.querySelector('video')
      videoNode.src = thePage.mp4Folder + theFile;
      toggleVideo(true);
      break;
    }
  }
  
}

