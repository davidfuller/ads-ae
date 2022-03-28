const ipcRenderer = require("electron").ipcRenderer;
const tc = require("./timecode.js")
const command = require("./command.js")
const settings = require('./settings');
const path = require('path');
const errorMessages = require('./errorMessages')

let pages = [];
let userPath;
let theSettings = {};
let genLog = [];

ipcRenderer.send("getUserPath");
ipcRenderer.send("getSettings");

ipcRenderer.on("receiveMessage", (event, data) => {
  const passwordTag = document.querySelector("#status");
  passwordTag.innerText = data;
});

ipcRenderer.on("userPath", (event,data) => {
  userPath = data;
  console.log(userPath);
})

ipcRenderer.on("refreshPages", async () => {
  await refreshThePages();
})

ipcRenderer.on("reloadPages", () => {
  reloadThePages();
})

ipcRenderer.on("receiveSettings", () => {
  getSettings();
})


async function showBlack(){
    let result = [];
    result = await command.playBlack('black', theSettings.currentConfig.playoutSubDevice, true, '');
    console.log(result);
    ipcRenderer.send('sendMessage','Showing Black');
}

async function showTestSignal(){
    let result = [];
    result = await command.playTest('test', theSettings.currentConfig.playoutSubDevice, true, '');
    console.log(result);
    ipcRenderer.send('sendMessage','Showing Test Signal');
}
async function playoutPageWorkfileOverTest(){
    //Playout Page and Background from Workfile
    let temp = await command.playOutOverTest(theSettings.workDetailsFilenameUNC, theSettings.currentConfig);      
    console.log(temp);
    ipcRenderer.send('sendMessage','Playing Out Page Over Test');
}
async function playoutPageWorkfile(){
  //Playout Page and Background from Workfile
  let temp = await command.playOut(theSettings.workDetailsFilenameUNC, theSettings.currentConfig);      
  console.log(temp);
  ipcRenderer.send('sendMessage','Playing Out Page');
}

async function playoutPageNumber(){
  //Playout Page and Background from pageNumber
  let pageNumber = document.querySelector(".pageNo").value;
  await playoutPage(pageNumber);
}

async function playoutPage(pageNumber){
  ipcRenderer.send('sendMessage','Cueing Page ' + pageNumber);
  let temp = await command.playoutPageNumber(pageNumber, theSettings.currentConfig);      
  currentPlayoutDetails.startTimecode = temp.theCommand.timecodeStart;
  currentPlayoutDetails.pageNumber = temp.theCommand.pageNumber;
  currentPlayoutDetails.playoutEnd = temp.theCommand.playoutEnd;
}

async function playoutPageNumberOverTest(){
  //Playout Page from pageNumber over Test
  let pageNumber = document.querySelector(".pageNo").value
  let temp = await command.playoutPageNumberOverTest(pageNumber, theSettings.currentConfig);     
  console.log(temp);
  
  /*
  theCommand = temp.theCommand;
  result = temp.result;
  */
  ipcRenderer.send('sendMessage','Playing Out Page');
}

let pageBlock = document.getElementById("page-block");
async function reloadThePages(){
  ipcRenderer.send('sendMessage','Reading Pages');
  
  pageBlock.style.display = "none";
  pages = await getThePages(userPath);
  fillListbox(pages);
  ipcRenderer.send('sendMessage','Idle');
  pageBlock.style.display = "block";
  let readPagesButton = document.getElementById("read-buttons");
  readPagesButton.style.display = "none";
}

async function refreshThePages(){
  ipcRenderer.send('sendMessage','Reading Pages');
  pages = await getThePagesFromCache(userPath);
  fillListbox(pages);
  ipcRenderer.send('sendMessage','Idle');
  let pageBlock = document.getElementById("page-block");
  pageBlock.style.display = "block";
  let readPagesButton = document.getElementById("read-buttons");
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
  if (theFiles){
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
}

async function getSettings(){
  theSettings = await settings.readSettings(userPath);
  console.log(theSettings);
}

async function renderAllJpegs(){
  genLog.length = 0;
  let theMessage = {};
  let numErrors =0;
  let theFiles = await command.readDirectory(theSettings.pageWorkDetailsFolderUNC);
  theFiles.sort();
  let filteredFiles = theFiles.filter(theFile => theFile.match(/^Work_Details.*.json$/i));
  theMessage.pageCount = filteredFiles.length
  theMessage.message = 'About to create ' + theMessage.pageCount + ' items';
  theMessage.time = new Date();
  addToGenerateStatusListbox(theMessage);
  let errorMessage = document.getElementById("num-errors")

  genLog.push(theMessage);
  for (const myFile of filteredFiles){
    let workFile = path.join(theSettings.pageWorkDetailsFolderUNC, myFile);
    if (filteredFiles.indexOf(myFile) == 0){
      await command.clearJpegFolder(workFile);
    }
    let temp = await command.exportJpegFromWorkfile(workFile);
    let theMessage = {};
    theMessage.pageNumber = temp.theCommand.pageNumber;
    theMessage.time = new Date();
    if (temp.result[0].log[0].hasError){
      theMessage.message = 'Page ' + theMessage.pageNumber + ' has error.';
      theMessage.errors = temp.result[0].log[0].theErrors
      theMessage.hasError = true;
      numErrors += 1;
    } else {
      theMessage.message = 'Page ' + theMessage.pageNumber + ' created.';
      theMessage.hasError = false;
    }
    genLog.push(theMessage);
    addToGenerateStatusListbox(theMessage);
    errorMessage.innerText = 'Creating page ' + (filteredFiles.indexOf(myFile) + 1) + ' of ' + filteredFiles.length + ": " + numErrors + " Errors"
  }
  console.log(genLog);
  errorMessage.innerText = filteredFiles.length + " pages created: " + numErrors + " Errors"
}

function getJsonPlayoutFolder(){
  ipcRenderer.send("getFolderDialog");
}

function displayError(){
  let pageNumber = errorPageNumber();
  let errorStatus = document.getElementById("error-status");
  for (log of genLog){
    if (pageNumber == log.pageNumber){
      errorStatus.textContent = errorMessages.parseErrors(log)
    }
  }
}

function errorPageNumber(){
  var e = document.getElementById("select-generate-status");
  return e.options[e.selectedIndex].value;
}

ipcRenderer.on("folderChoice", async (event, folderStuff) => {
  if (!folderStuff.canceled){
    if (folderStuff.filePaths.length > 0){
      let jsonFolder = document.getElementById("page-json-folder");
      jsonFolder.value = folderStuff.filePaths[0];
      theSettings.pageWorkDetailsFolderUNC = folderStuff.filePaths[0];
      settings.saveSettings(theSettings, userPath);
      await reloadThePages(theSettings, userPath)
    }
  }
})

let generateBlock = document.getElementById("status-block");
let otherBlock = document.getElementById("the-rest");

function generateJpegs(){
  generateBlock.style.display = "block";
  pageBlock.style.display = "none";
  otherBlock.display = "none";
}

function displayJpegs(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "block";
  otherBlock.display = "none";
}

function displayOther(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "none";
  otherBlock.display = "block";
}