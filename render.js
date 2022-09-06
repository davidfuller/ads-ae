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
ipcRenderer.send("refreshPages");
//await refreshPages();

ipcRenderer.on("receiveMessage", (event, data) => {
  const passwordTag = document.querySelector("#status");
  passwordTag.innerText = data;
});

ipcRenderer.on("userPath", (event,data) => {
  userPath = data;
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
    ipcRenderer.send('sendMessage','Showing Black');
}

async function showTestSignal(){
    let result = [];
    result = await command.playTest('test', theSettings.currentConfig.playoutSubDevice, true, '');
    ipcRenderer.send('sendMessage','Showing Test Signal');
}
async function playoutPageWorkfileOverTest(){
    //Playout Page and Background from Workfile
    let temp = await command.playOutOverTest(theSettings.workDetailsFilenameUNC, theSettings.currentConfig);      
    ipcRenderer.send('sendMessage','Playing Out Page Over Test');
}
async function playoutPageWorkfile(){
  //Playout Page and Background from Workfile
  let temp = await command.playOut(theSettings.workDetailsFilenameUNC, theSettings.currentConfig);      
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
  let thePage = listboxPageNumber();
  let filenameBase = findPageNumber(thePage).jpegFilenameBase;
  let videoFilename = await videoFileForPageNumber();
  let jpegNo = 0
  let target = document.getElementById('my-jpeg');
  let videoMessage
  let jpg64
  if (videoFilename != null){
   videoMessage = "<h1>Double click image for video</h1>"       
  } else {
    videoMessage = "<h1>No video file</h1>"       
  }
  do {
    let jpegFilenameUNC = filenameBase + '_' + jpegNo + '.jpg';
    jpg64 = await command.readJpeg(jpegFilenameUNC);
    if (jpegNo == 0){
      if (jpg64 != ''){
        
        let image = '<img src="data:image/jpg;base64,' + jpg64 + '" ondblclick="playVideo()" />';
        target.innerHTML = videoMessage + image;
      } else {
        target.innerHTML = "<h1>No Jpeg for this page</h1>"
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
      console.log(page);
      return page;
    }
  }
  return null;
}

function toggleVideo(forceVideo){
  let myVideo = document.getElementById("my-video");
  let myJpeg = document.getElementById("my-jpeg");
  let btn = document.getElementById("toggle-video-jpeg");
  let myPlayer = document.getElementById("my-player")
  btn.style.display = "block";
  if (forceVideo){
    btn.innerText = "Show Jpeg";
    myVideo.style.display = "block";
    myJpeg.style.display = "none";
  } else if (myVideo.style.display == "block"){
    btn.innerText = "Show Video";
    myVideo.style.display = "none";
    myJpeg.style.display = "block";
    myPlayer.pause();
  } else {
    btn.innerText = "Show Jpeg"
    myVideo.style.display = "block";
    myJpeg.style.display = "none";
  }

}

async function playVideo(){
  let videoFile = await videoFileForPageNumber();
  if (videoFile){
    let videoNode = document.querySelector('video')
    videoNode.src = videoFile;
    toggleVideo(true);
  }
}

async function videoFileForPageNumber(){
  let pageNumber = listboxPageNumber();
  let thePage = findPageNumber(pageNumber);
  let theFiles = await command.readDirectory(thePage.mp4Folder);
  if (theFiles){
    theFiles.sort();
    theFiles.reverse();
    for (theFile of theFiles){
      if (theFile.includes(thePage.mp4FilePattern)){
        console.log(theFile);
        return thePage.mp4Folder + theFile;
      }
    }
  }
  return null;
}

async function getSettings(){
  theSettings = await settings.readSettings(userPath);
}

let allErrorsBlock = document.getElementById("full-error-list");
let showAllErrorsBtn = document.getElementById("show-all-errors");
let errorStatus = document.getElementById("error-status");

async function renderAllJpegs(){
  emptyListBox("select-generate-status");
  showAllErrorsBtn.style.display = 'none';
  allErrorsBlock.style.display = 'none';
  errorStatus.textContent = '';
  genLog.length = 0;
  let theMessage = {};
  let numErrors = 0;
  let theFiles = await command.readDirectory(theSettings.pageWorkDetailsFolderUNC);
  theFiles.sort();
  let filteredFiles = theFiles.filter(theFile => theFile.match(/^Work_Details.*.json$/i));
  theMessage.pageCount = filteredFiles.length
  theMessage.message = 'About to create ' + theMessage.pageCount + ' items';
  theMessage.time = new Date();
  addToGenerateStatusListbox(theMessage);
  let errorMessage = document.getElementById("num-errors")
  let errorList = [];

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
    theMessage.workfile = workFile;
    
    if (temp.result[0].log[0].hasError){
      theMessage.message = 'Page ' + theMessage.pageNumber + ' has error.';
      theMessage.errors = temp.result[0].log[0].theErrors
      theMessage.hasError = true;
      numErrors += 1;
      let someErrors = errorMessages.parseErrors(theMessage);
      console.log('Some Errors');
      console.log(someErrors)
      for (anError of someErrors){
        if (anError != ''){
          console.log('An Error');
          console.log(anError)
          if (!errorList.includes(anError)){
            console.log('An Error Included');
            console.log(anError)
            errorList.push(anError);
            errorList.sort();
          }
        }
      }
      console.log(errorList);
      let fullErrorList = document.getElementById("full-error-list");
      fullErrorList.innerText = errorList.join('\r\n')
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
  showAllErrorsBtn.style.display = 'block';
}

function getJsonPlayoutFolder(){
  ipcRenderer.send("getFolderDialog");
}

function showAllErrors(){
  if (allErrorsBlock.style.display == 'none'){
    allErrorsBlock.style.display = 'block';
  } else {
    allErrorsBlock.style.display = 'none';
  }
}


function displayError(){
  let pageNumber = errorPageNumber();
  for (log of genLog){
    if (pageNumber == log.pageNumber){
      errorStatus.textContent = errorMessages.parseErrorMultiline(log)
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
let myJpegBlock = document.getElementById("my-jpeg");
let myVideoBlock = document.getElementById("my-video");
let myADSBlock = document.getElementById("ads");
let myFolderBlock = document.getElementById("folder-selection")

function generateJpegs(){
  generateBlock.style.display = "block";
  pageBlock.style.display = "none";
  otherBlock.style.display = "none";
  myJpegBlock.style.display = "none";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "none";
  myFolderBlock.style.display = "block";
}

function displayJpegs(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "block";
  otherBlock.style.display = "none";
  myJpegBlock.style.display = "block";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "none";
  myFolderBlock.style.display = "block";
}

function displayOther(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "none";
  otherBlock.style.display = "block";
  myJpegBlock.style.display = "none";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "none";
  myFolderBlock.style.display = "none";
}
async function displayADS(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "none";
  otherBlock.style.display = "none";
  myJpegBlock.style.display = "none";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "block";
  myFolderBlock.style.display = "none";

  let description = await command.pageDetailsDescription(theSettings.adsWorkDetailsFilenameUNC);
  let descriptionElement = document.getElementById('ads-description');
  descriptionElement.innerText = description;
}

async function playoutADS(){
  //let temp = await command.playOut(theSettings.adsWorkDetailsFilenameUNC, theSettings.currentConfig);      
  let temp = await command.playOutFromFullDetails(theSettings.adsFullDetailsFilenameUNC, theSettings.currentConfig);
  ipcRenderer.send('sendMessage','Playing Out Page');
}

async function createJpegADS(){
  let temp = await command.exportJpegFromFullDetailsFile(theSettings.adsFullDetailsFilenameUNC);
  console.log(temp.theCommand.filenames);
  await displayJpegADS(temp.theCommand.filenames);
}

async function displayJpegADS(jpegFilenames){
  let jpg64
  let target = document.getElementById('ads-jpeg');
  for (filename of jpegFilenames){
    jpg64 = await command.readJpeg(filename);
    if (jpegFilenames.indexOf(filename) == 0){
      if (jpg64 != ''){
        let image = '<img src="data:image/jpg;base64,' + jpg64 + '" />';
        target.innerHTML = image;
      } else {
        target.innerHTML = "<h1>No Jpeg for this page</h1>"
      }
    } else {
      if (jpg64 != ''){
        let image = '<img src="data:image/jpg;base64,' + jpg64 + '" />';
        target.insertAdjacentHTML('beforeend', image);  
      } else {
        target.innerHTML = "<h1>No Jpeg for this page</h1>"
      }
    }
  }
  
}

let adsMp4Details = {}
async function renderMp4ADS(){
  //let temp = await command.exportMp4FromWorkfile(theSettings.adsWorkDetailsFilenameUNC); 
  let temp = await command.exportMp4FromFullDetailsFile(theSettings.adsFullDetailsFilenameUNC); 
  console.log(temp);
  adsMp4Details.folder = temp.theCommand.renderFolder
  adsMp4Details.filename = temp.theCommand.renderFilename
}

function playMp4ADS(){
  playADSVideo(adsMp4Details.folder, adsMp4Details.filename);
}

function playADSVideo(folder, filename){
  let videoFile = path.join(folder, filename);
  console.log(videoFile);
  if (videoFile){
    let videoNode = document.getElementById('ads-player');
    videoNode.src = videoFile;
    let videoBlock = document.getElementById('ads-video')
    videoBlock.style.display = "block";
  }
}

async function renderMp4(){
  let thePage = listboxPageNumber();
  console.log(thePage)
  pageDetails = findPageNumber(thePage)
  let workFile = path.join(pageDetails.folder, pageDetails.filename);
  let temp = await command.exportMp4FromWorkfile(workFile); 
  console.log(temp);
}

