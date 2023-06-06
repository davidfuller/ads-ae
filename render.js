const ipcRenderer = require("electron").ipcRenderer;
const tc = require("./timecode.js")
const command = require("./command.js")
const settings = require('./settings');
const path = require('path');
const errorMessages = require('./errorMessages')
const fs = require('fs')
const ads = require('./ads.js');
const api = require('./apiHandler.js');
const xmlToJson = require('./genericXmlJson.js');
const { resourceLimits } = require("worker_threads");
const afterFxBat = '\\\\alpaca\\dropbox\\Development\\Adobe\\ads.bat';

let pages = [];
let userPath;
let theSettings = {};
let genLog = [];
let aeJson;
let jsonAds;
let aeName;

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
let myAdsAeBlock = document.getElementById("ads-ae");
let myAdsCommonBlock = document.getElementById("ads-common");
let myFolderBlock = document.getElementById("folder-selection")

function generateJpegs(){
  generateBlock.style.display = "block";
  pageBlock.style.display = "none";
  otherBlock.style.display = "none";
  myJpegBlock.style.display = "none";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "none";
  myAdsAeBlock.style.display = "none";
  myAdsCommonBlock.style.display = "none";
  myFolderBlock.style.display = "block";
}

function displayJpegs(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "block";
  otherBlock.style.display = "none";
  myJpegBlock.style.display = "block";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "none";
  myAdsAeBlock.style.display = "none";
  myAdsCommonBlock.style.display = "none";
  myFolderBlock.style.display = "block";
}

function displayOther(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "none";
  otherBlock.style.display = "block";
  myJpegBlock.style.display = "none";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "none";
  myAdsAeBlock.style.display = "none";
  myAdsCommonBlock.style.display = "none";
  myFolderBlock.style.display = "none";
}
async function displayADS(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "none";
  otherBlock.style.display = "none";
  myJpegBlock.style.display = "none";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "block";
  myAdsAeBlock.style.display = "none";
  myAdsCommonBlock.style.display = "block";
  myFolderBlock.style.display = "none";

  let description = await command.pageDetailsDescription(theSettings.adsWorkDetailsFilenameUNC);
  let descriptionElement = document.getElementById('ads-description');
  descriptionElement.innerText = description;
}
async function displayAdsAe(){
  generateBlock.style.display = "none";
  pageBlock.style.display = "none";
  otherBlock.style.display = "none";
  myJpegBlock.style.display = "none";
  myVideoBlock.style.display = "none";
  myADSBlock.style.display = "none";
  myAdsAeBlock.style.display = "block";
  myAdsCommonBlock.style.display = "block";
  myFolderBlock.style.display = "none";

}

async function playoutADS(){
  //let temp = await command.playOut(theSettings.adsWorkDetailsFilenameUNC, theSettings.currentConfig);      
  let temp = await command.playOutFromFullDetails(theSettings.adsFullDetailsFilenameUNC, theSettings.currentConfig);
  ipcRenderer.send('sendMessage','Playing Out Page');
}

async function createJpegADS(){
  let adsErrorList = document.getElementById("ads-error-list");
  adsErrorList.innerText = 'Attempting to create jpegs'
  let adsVideo = document.getElementById("ads-video")
  adsVideo.style.display = "none";
  let temp = await command.exportJpegFromFullDetailsFile(theSettings.adsFullDetailsFilenameUNC);
  console.log(temp);
  let myResult = dealWithAnyErrors(temp);
  adsErrorList.innerText = myResult.message.join('\r\n')
  if (!myResult.hasError){
    await displayJpegADS(temp.theCommand.filenames);
  }
}

async function displayJpegADS(jpegFilenames){
  let jpg64
  let adsJpeg = document.getElementById('ads-jpeg');
  adsJpeg.style.display = "block";
  
  for (filename of jpegFilenames){
    jpg64 = await command.readJpeg(filename);
    if (jpegFilenames.indexOf(filename) == 0){
      if (jpg64 != ''){
        let image = '<img src="data:image/jpg;base64,' + jpg64 + '" />';
        adsJpeg.innerHTML = image;
      } else {
        adsJpeg.innerHTML = "<h1>No Jpeg for this page</h1>"
      }
    } else {
      if (jpg64 != ''){
        let image = '<img src="data:image/jpg;base64,' + jpg64 + '" />';
        adsJpeg.insertAdjacentHTML('beforeend', image);  
      } else {
        adsJpeg.innerHTML = "<h1>No Jpeg for this page</h1>"
      }
    }
  }
  
}

let adsMp4Details = {}
async function renderMp4ADS(){
  let adsJpeg = document.getElementById('ads-jpeg');
  adsJpeg.style.display = "none";
  
  let adsErrorList = document.getElementById("ads-error-list");
  adsErrorList.innerText = 'Attempting to create mp4'
  //let temp = await command.exportMp4FromWorkfile(theSettings.adsWorkDetailsFilenameUNC); 
  let temp = await command.exportMp4FromFullDetailsFile(theSettings.adsFullDetailsFilenameUNC); 
  console.log(temp);
  let myResult = dealWithAnyErrors(temp);
  adsErrorList.innerText = myResult.message.join('\r\n')
  adsMp4Details.folder = temp.theCommand.renderFolder
  adsMp4Details.filename = temp.theCommand.renderFilename
  let fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
  if (fs.existsSync(fullFilename)){
    let doWeContinue = await waitForFile(fullFilename, myResult.message, adsErrorList, 300, 200)
    if (doWeContinue){
      loadADSVideo(fullFilename);
    }
  } else {
    myResult.message[0] = "Cannot find mp4 file";
    adsErrorList.innerText = myResult.message.join('\r\n');
  }
}

async function renderMp4ADSfromFulldetails(fullDetails){
  let adsJpeg = document.getElementById('ads-jpeg');
  let finalResult = true;
  let adsErrorList = document.getElementById("ads-error-list");
  adsErrorList.innerText = 'Attempting to create mp4'
  let temp = await command.exportMp4FromFullDetails(fullDetails); 
  console.log(temp);
  let myResult = dealWithAnyErrors(temp);
  adsErrorList.innerText = myResult.message.join('\r\n')
  adsMp4Details.folder = temp.theCommand.renderFolder
  adsMp4Details.filename = temp.theCommand.renderFilename
  let fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
  if (fs.existsSync(fullFilename)){
    let doWeContinue = await waitForFile(fullFilename, myResult.message, adsErrorList, 300, 200)
    if (doWeContinue){
      adsJpeg.style.display = "none";
      adsErrorList.innerText = "Mp4 created: " + adsMp4Details.filename
      loadADSVideo(fullFilename);
      finalResult = true;
    } else {
      myResult.message[0] = "Issue with mp4 file";
      adsErrorList.innerText = myResult.message.join('\r\n');  
      finalResult = false;
    }
  } else {
    myResult.message[0] = "Cannot find mp4 file";
    adsErrorList.innerText = myResult.message.join('\r\n');
    finalResult = false;
  }
  return {result: finalResult, fullFilename: fullFilename, filename: adsMp4Details.filename};
}

async function waitForMp4FromAe(aeJson){
  let adsJpeg = document.getElementById('ads-jpeg');
  let finalResult = true;
  let adsErrorList = document.getElementById("ads-error-list");
  adsErrorList.innerText = 'Waiting for mov from After Effects'
  console.log(aeJson);
  console.log(aeName);
  let myResult = {};
  adsMp4Details.folder = aeJson.specials.specials[aeName].aeRenderFolder
  adsMp4Details.filename = aeJson.specials.specials[aeName].renderFilename
  let fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
  let doesFileExist = await waitForFileExist(fullFilename, adsErrorList, 2000, 100);
  if (doesFileExist){
    myResult.message = []
    let doWeContinue = await waitForFile(fullFilename, myResult.message, adsErrorList, 300, 200)
    if (doWeContinue){
      adsJpeg.style.display = "none";
      adsErrorList.innerText = "Mov created: " + adsMp4Details.filename
      loadADSVideo(fullFilename);
      finalResult = true;
    } else {
      myResult.message[0] = "Issue with mov file";
      adsErrorList.innerText = myResult.message.join('\r\n');  
      finalResult = false;
    }
  } else {
    myResult.message = []
    myResult.message[0] = "Cannot find mov file";
    adsErrorList.innerText = myResult.message.join('\r\n');
    finalResult = false;
  }
  return {result: finalResult, fullFilename: fullFilename, filename: adsMp4Details.filename};
}



function playMp4ADS(){
  playADSVideo(adsMp4Details.folder, adsMp4Details.filename);
}

function waitForMP4(fullFilename, theMessages, theElement, bPlayWhenReady){
  
  let count = 0;
  let sizeCount = 0;
  let lastSize = 0;
  let timeoutCount = 200;

  // function creation
  let interval = setInterval(function(){
  
      // increasing the count by 1
      count += 1;
      
      // when count equals to timeout, stop the function
      if(count === timeoutCount){
          clearInterval(interval);
          let myMessages = theMessages.slice();
          myMessages.push('Creating the mp4 has timed out');
          theElement.innerText = myMessages.join('\r\n');
      } else {
        let mySize = getFilesizeInBytes(fullFilename);
        let myMessages = theMessages.slice();
        if (mySize != 0){
          myMessages.push("Filesize: "+ mySize);
          theElement.innerText = myMessages.join('\r\n');
        }
        if (mySize !=0 && lastSize == mySize){
          sizeCount += 1
          if (sizeCount > 5){
            clearInterval(interval);
            let myMessages = theMessages.slice();
            myMessages[0] = "MP4 ready";
            theElement.innerText = myMessages.join('\r\n');
            if (bPlayWhenReady){
              loadADSVideo(fullFilename);
            }
          } else {
            lastSize = mySize;
          }
        } else {
          lastSize = mySize;
          sizeCount = 0;
        }
      }
  }, 300);

}

function loadADSVideo(fullFilename){
  let videoNode = document.getElementById('ads-player');
  videoNode.src = fullFilename;
  let videoBlock = document.getElementById('ads-video')
  videoBlock.style.display = "block";
}

function emptyADSVideo(){
  let videoNode = document.getElementById('ads-player');
  videoNode.src = '';
  let videoBlock = document.getElementById('ads-video')
  videoBlock.style.display = "none";
}

async function playADSVideo(folder, filename){
  emptyADSVideo();
  let adsJpeg = document.getElementById('ads-jpeg');
  adsJpeg.style.display = "none";
  let adsErrorList = document.getElementById("ads-error-list");
  if (!folder ||!filename){
    adsErrorList.innerText = 'No file for mp4'
  } else {
    let videoFile = path.join(folder, filename);
    adsErrorList.innerText = 'Loading mp4'
    let messages = ["Loading mp4"]
    if (fs.existsSync(videoFile)){
      let doWeContinue = await waitForFile(videoFile, messages, adsErrorList, 300, 200)
      if (doWeContinue){
        loadADSVideo(videoFile);
      }
    }
  }
  
}
function getFilesizeInBytes(filename) {
  var stats = fs.statSync(filename);
  var fileSizeInBytes = stats.size;
  return fileSizeInBytes;
}
async function renderMp4(){
  let thePage = listboxPageNumber();
  console.log(thePage)
  pageDetails = findPageNumber(thePage)
  let workFile = path.join(pageDetails.folder, pageDetails.filename);
  let temp = await command.exportMp4FromWorkfile(workFile); 
  console.log(temp);
}

function dealWithAnyErrors(temp){
  let errorList = [];
  let theMessage = {};
  theMessage.time = new Date();
  theMessage.workfile = theSettings.adsFullDetailsFilenameUNC;

  if (temp.result[0].log[0].hasError){
    theMessage.message = temp.theCommand.commandName + " has errors in: " + temp.result[0].log[0].eventName;
    theMessage.errors = temp.result[0].log[0].theErrors
    theMessage.hasError = true;
    let someErrors = errorMessages.parseErrors(theMessage);
    for (anError of someErrors){
      if (anError != ''){
        if (!errorList.includes(anError)){
          errorList.push(anError);
          errorList.sort();
        }
      }
    }
    errorList.unshift(theMessage.message);
    return {message: errorList, hasError: true}
  } else {
    let statusList = [];
    if (temp.theCommand.commandName == "Export JPEG from workfile"){
      statusList.push("Files created");
      for (aFile of temp.theCommand.filenames){
        statusList.push(path.parse(aFile).base)
      }
    }
    if (temp.theCommand.commandName == "Export mp4 from workfile"){
      statusList.push("Creating MP4");
      statusList.push(temp.theCommand.renderFilename);
    }
    
    return {message: statusList, hasError: false}
  }
}

async function fileReady(){
  let adsErrorList = document.getElementById("ads-error-list");
  let theResult = await waitForMp4FromAe(aeJson)
  console.log(theResult);
  let finalMessages = []
  if (theResult.result){
    let serverChoice = document.getElementById("ads-server");
    let serverSettings = await ads.readServerSettings(userPath, serverChoice.value);
    let copySuccess = await ads.copyMp4ToServer(theResult.fullFilename, jsonAds, serverSettings);
    adsErrorList.innerText = copySuccess.message;
    finalMessages.push(copySuccess.message);
    if (copySuccess.result){
      let updateSuccess= await ads.sendFileQueuedToWebApp(theResult.filename, jsonAds, serverSettings);
      finalMessages.push(updateSuccess.message);
      adsErrorList.innerText = finalMessages.join('\r\n')
    }
  }
}

async function getData(aeOnly){
/**
 * @type {BackgroundMedia}
 */


  let doAfterEffects = true;

  let adsErrorList = document.getElementById("ads-error-list");
  let adsUrl = document.getElementById("ads-url");
  if (aeOnly){
    adsErrorList.innerText = 'Creating data for After Effects'
  } else {
    adsErrorList.innerText = 'Attempting to create jpegs from API data'
  }
  
  if (doAfterEffects){
    let aeDescription = document.getElementById("ads-after-effects");
    //aeDescription.innerText = "Doing After Effects also";
  }
  let adsVideo = document.getElementById("ads-video")
  adsVideo.style.display = "none";  

  let serverChoice = document.getElementById("ads-server");
  let isTestServer = (serverChoice.value == 'test');
  console.log("Server choice");
  console.log(serverChoice.value);
  console.log(isTestServer);

  let background = await ads.readBackground(userPath);
  let pageSettings = await ads.readPageSettings(userPath);
  let serverSettings = await ads.readServerSettings(userPath, serverChoice.value);
  let myData;
  let apiSuccess;

  try {
    adsUrl.innerText = serverSettings.url;
    myData = await api.httpGet(serverSettings.url);
    apiSuccess = true;
  } catch (e){
    console.log("Cannot connect to server")
    adsErrorList.innerText = 'Cannot connect to server'
    apiSuccess = false;
  }
  
  if (apiSuccess){
    console.log("My Data");
    console.log(myData)
    jsonAds = xmlToJson.parseXML(myData);
    console.log("JSON")
    console.log(jsonAds);

    if (jsonAds.media_files === "\n"){
      console.log("Empty data")
      adsErrorList.innerText = 'No special previews to render'
    } else {
      let description = ads.sanitisedName(jsonAds);
      let descriptionElement = document.getElementById('ads-description');
      descriptionElement.innerText = description;

      let pageNumber = jsonAds.media_files.item[0].page[0];

      let theTemplate = await ads.findTemplate(userPath, jsonAds);
      if (theTemplate === undefined){
        adsErrorList.innerText = 'Cannot find template for page ' + pageNumber;
      } else {
        aeName = theTemplate.template.aeName;
        let doWeContinue;
        if (aeOnly){
          doWeContinue = true;
        } else {
          let ppwgFilename = await ads.createPPWG(userPath, jsonAds, pageSettings, pageNumber);
          let messages = ["Creating ppwg"]
          doWeContinue = await waitForFile(ppwgFilename, messages, adsErrorList, 200, 200)
        }
        console.log(doWeContinue)
        if (doWeContinue){
          console.log("Ready for next bit")
          console.log(theTemplate);
          let pageDetails;
          let jpegDetails;
          if (!aeOnly){
            pageDetails = await ads.createPageDetails(userPath, jsonAds, theTemplate, pageSettings, pageNumber);
            console.log("PageDetails")
            console.log(pageDetails);
            jpegDetails = await ads.createJpegDetails(userPath, jsonAds, pageSettings, pageNumber);
            console.log("Jpeg Details");
            console.log(jpegDetails);
          }
          
          let renderDetails = await ads.createRenderDetails(userPath, jsonAds, theTemplate);
          console.log("Render Details");
          console.log(renderDetails);
          
          
          if (doAfterEffects){
            aeJson = await ads.createAeJson(userPath, jsonAds, theTemplate, theSettings, renderDetails);
            console.log ("This is the AE Json");
            console.log (aeJson);
            let aeJsonFileDisplay = document.getElementById("ads-aejson");
            aeJsonFileDisplay.innerText = aeJson.filename;
          }  
  

          let fullDetails = {};
          if (!aeOnly){
            fullDetails = background
            fullDetails.pageDetails = pageDetails;
            fullDetails.jpegDetails = jpegDetails;
            fullDetails.renderDetails = renderDetails;
            fullDetails.ppwgFilename = ppwgFilename;
  
            console.log("Full Details");
            console.log(fullDetails);
          }
          
          
          let mediaFilenames = await ads.mediaFields(userPath, jsonAds, true);
          let missingFiles = ads.missingMediaFiles(mediaFilenames);
          let success = {};
          success.result = true;
          if (missingFiles.length > 0){
            adsErrorList.innerText = 'Attempting to copy missing files'
            success = await ads.copyMissingFiles(userPath, missingFiles, isTestServer);
            adsErrorList.innerText = success.messages.join('\r\n')
          }

          if (doAfterEffects){
            adsErrorList.innerText = 'Attempting to copy AE files'
            let aeSuccess = await ads.copyAeMediaFiles(userPath, aeJson.media);
            adsErrorList.innerText = aeSuccess.messages.join('\r\n')
            await ads.updateAeJobFile(aeJson.specials, theTemplate, renderDetails);
          }

          if (success.result && !aeOnly){
            let temp = await command.exportJpegFromFullDetails(fullDetails);
            console.log(temp);
            let myResult = dealWithAnyErrors(temp);
            adsErrorList.innerText = myResult.message.join('\r\n')
            if (!myResult.hasError){
              await displayJpegADS(temp.theCommand.filenames);
              let theResult = await renderMp4ADSfromFulldetails(fullDetails);
              let finalMessages = []
              if (theResult.result){
                let copySuccess = await ads.copyMp4ToServer(theResult.fullFilename, jsonAds, serverSettings);
                adsErrorList.innerText = copySuccess.message;
                finalMessages.push(copySuccess.message);
                if (copySuccess.result){
                  let updateSuccess= await ads.sendFileQueuedToWebApp(theResult.filename, jsonAds, serverSettings);
                  finalMessages.push(updateSuccess.message);
                  adsErrorList.innerText = finalMessages.join('\r\n')
                }
              }
            }
          }
        } else {
          adsErrorList.innerText = 'Failed to create ppwg file'
        } 
      }   
    }
  }
}


async function fileSizeSettled(fullFilename, lastSize, sizeCount){
  let result = {}
  if (fs.existsSync(fullFilename)){
    let mySize = getFilesizeInBytes(fullFilename);
    console.log(mySize);
    result.lastSize = mySize;
    result.sizeCount = sizeCount;
    if (mySize !=0 && lastSize == mySize){
      sizeCount += 1;
      result.sizeCount = sizeCount;
      console.log(sizeCount);
      if (sizeCount > 5){
        result.done = true
      } else{
        result.done = false
      }
    } else {
      result.done = false
      result.sizeCount = 0;
    }
  } else {
    result.done = false
    result.sizeCount = 0;
    result.lastSize = 0;
    console.log('No File')
  }
  return result
}

async function asyncInterval(callback, fullFilename, theMessages, theElement, ms, triesLeft = 200){
  let myResult = {};
  myResult.lastSize = 0;
  myResult.sizeCount = 0;
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      myResult = await callback(fullFilename, myResult.lastSize, myResult.sizeCount)
      let myMessages = theMessages.slice();
      myMessages.push("Filesize: "+ myResult.lastSize);
      theElement.innerText = myMessages.join('\r\n');
      console.log(myResult);
      if (myResult.done) {
        resolve();
        clearInterval(interval);
        let myMessages = theMessages.slice();
        myMessages.push("File ready");
        theElement.innerText = myMessages.join('\r\n');
      } else if (triesLeft <= 1) {
        reject();
        clearInterval(interval);
        let myMessages = theMessages.slice();
        myMessages.push("File timeout");
        theElement.innerText = myMessages.join('\r\n');
      }
      triesLeft--;
      console.log("Tries left: " + triesLeft)
    }, ms);
  });
}

async function waitForFile(fullFilename, theMessages, theElement, msInterval, triesLeft){
  try {
    console.log(await asyncInterval(fileSizeSettled, fullFilename, theMessages, theElement, msInterval, triesLeft));
  } catch (e) {
    console.log("Error");
    return false
  }
  console.log("Done!");
  return true
}

async function waitForFileExist(fullFilename, adsErrrorList, msInterval, triesLeft ){
  try {
    console.log(await asyncExistInterval(theFileExists, fullFilename, adsErrrorList, msInterval, triesLeft));
  } catch (e) {
    console.log("Error. File Exists!");
    return false;
  }
  console.log("Done! File exists");
  return true;
}

async function asyncExistInterval(myFileExists, fullFilename, adsErrorList, msInterval, triesLeft = 10){
  return new Promise((resolve, reject) => {
    const theInterval = setInterval(async () => {
      myResult = await myFileExists(fullFilename);
      if (myResult){
        resolve();
        clearInterval(theInterval);
        adsErrorList.innerText = "File present"
      } else if (triesLeft <= 1){
        reject();
        clearInterval(theInterval);
        adsErrorList.innerText = "File not present. Timeout";
      }
      triesLeft--;
      console.log("Tries left: " + triesLeft);
      adsErrorList.innerText += ".";
    }, msInterval);
  });

}

async function theFileExists(fullFilename){
  return fs.existsSync(fullFilename);
}

function runAfterFX(path){
  const { exec } = require('child_process');
  exec(path, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(stdout);
  });
}

function startAfterFX(){
  let adsErrorList = document.getElementById("ads-error-list");
  adsErrorList.innerText = "Running After Effects"
  console.log("Running After Effects")
  runAfterFX(afterFxBat);
}


