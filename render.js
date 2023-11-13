const { ipcRenderer } = require("electron");
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
const mediaEncoderBat = '\\\\alpaca\\dropbox\\Development\\Adobe\\mediaEncoder.bat';
const logFilename = "log-YYYY-MM-DD.json"
const shortLogFilename = "short-log-YYYY-MM-DD.json"
const desktopCapturer = {
  getSources: (opts) => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES', opts)
}

let pages = [];
let userPath;
let theSettings = {};
let genLog = [];
let aeJson;
let jsonAds;
let aeName;
let aeLog = [];
let aeStartTime;
let nextPeriodicRun = "";
let isMac;

const renderType = {
  preview: Symbol('preview'),
  sportPreview: Symbol('sportPreview'),
  proRes: Symbol('proRes'),
  text: Symbol('text'),
  avi: Symbol('avi'),
  zip: Symbol('zip'),
  serverPackage: Symbol('serverPackage')
}

ipcRenderer.send("getUserPath");
ipcRenderer.send("getSettings");
ipcRenderer.send("getIsMac");


ipcRenderer.on("receiveMessage", (event, data) => {
  const passwordTag = document.querySelector("#status");
  passwordTag.innerText = data;
});

ipcRenderer.on("userPath", (event,data) => {
  userPath = data;
})

ipcRenderer.on("receiveSettings", () => {
  getSettings();
})

ipcRenderer.on("isMac", (event, data) => {
  isMac = data;
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

async function selectPage(){
  let pageNumber = listboxPageNumber()
  await playoutPage(pageNumber);
}

let currentPlayoutDetails = {}
currentPlayoutDetails.startTimecode = ""

async function getTime(){
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
  
  const statusTag = document.querySelector("#ads-periodic-status");
  if (nextPeriodicRun == ""){
    statusTag.innerText = "";
  } else {
    statusTag.innerText = tc.timecodeSubtract(nextPeriodicRun, theTime);  
    if (tc.timecodeGreaterThan(theTime, nextPeriodicRun)){
      let checkElement = document.getElementById('ads-periodic');
      checkElement.checked = false;
      nextPeriodicRun = "";
      let isItDone = await doTheLot();
      console.log(isItDone);
      checkElement.checked = true;
      setNextRun();
      console.log("Reset it")
    }
  }
}
setInterval(getTime, 40 );

function setNextRun(){
  const isChecked = checkboxValue();
  if (isChecked){
    nextPeriodicRun = tc.timecodeAddSeconds(tc.nowAsTimecode(), 120);
  } else {
    nextPeriodicRun = ""
  }
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

let myAdsAeDetailsBlock = document.getElementById("ads-ae-detail");
let myDetailsButton = document.getElementById("ads-button-details");

async function displayAdsAeDetails(){
  if (myAdsAeDetailsBlock.style.display == "block"){
    myAdsAeDetailsBlock.style.display = "none";
    myDetailsButton.innerText = "Show Details";
  } else {
    myAdsAeDetailsBlock.style.display = "block";
    myDetailsButton.innerText = "Hide Details"
  }
}

async function appendErrorList(message, returnPrefix = true){
  let adsErrorList = document.getElementById("ads-error-list");
  if (returnPrefix){
    adsErrorList.innerText += '\r\n' + message;
  } else {
    adsErrorList.innerText += message;
  }
  adsErrorList.scrollTop = adsErrorList.scrollHeight;
  await appendLog(message)
}
let adsMp4Details = {}

async function waitForMp4FromAe(aeJson){
  let finalResult = true;
  appendErrorList('Waiting for mov from After Effects');
  console.log(aeJson);
  console.log(aeName);
  let myResult = {};
  adsMp4Details.folder = aeJson.specials.specials[aeName].aeRenderFolder
  adsMp4Details.filename = aeJson.specials.specials[aeName].renderFilename
  let fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
  let doesFileExist = await waitForFileExist(fullFilename, 2000, 100);
  if (doesFileExist){
    myResult.message = []
    let doWeContinue = await waitForFile(fullFilename, myResult.message, 300, 200, 5)
    if (doWeContinue){
      appendErrorList('Mov created: ' + adsMp4Details.filename);
      loadADSVideo(fullFilename);
      finalResult = true;
    } else {
      myResult.message[0] = "Issue with mov file";
      appendErrorList(myResult.message.join('\r\n'));  
      finalResult = false;
    }
  } else {
    myResult.message = []
    myResult.message[0] = "Cannot find mov file";
    appendErrorList(myResult.message.join('\r\n'));
    finalResult = false;
  }
  return {result: finalResult, fullFilename: fullFilename, filename: adsMp4Details.filename};
}

async function waitForFileAE(fullFilename, displayName, loadVideo, settledCount){
  let finalResult = true;
  appendErrorList('Waiting for ' + displayName);
  let myResult = {};
  let doesFileExist = await waitForFileExist(fullFilename, 2000, 100);
  if (doesFileExist){
    myResult.message = []
    let doWeContinue = await waitForFile(fullFilename, myResult.message, 300, 200, settledCount);
    if (doWeContinue){
      appendErrorList(displayName + " created: " + path.basename(fullFilename));
      if (loadVideo){
        loadADSVideo(fullFilename);
      }
      finalResult = true;
    } else {
      myResult.message[0] = "Issue with " + displayName + " file";
      appendErrorList(myResult.message.join('\r\n'));  
      finalResult = false;
    }
  } else {
    myResult.message = []
    myResult.message[0] = "Cannot find" + displayName + " file";
    appendErrorList(myResult.message.join('\r\n'));
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
  if (!folder ||!filename){
    appendErrorList('No file for mp4');
  } else {
    let videoFile = path.join(folder, filename);
    appendErrorList('Loading mp4');
    let messages = ["Loading mp4"]
    if (fs.existsSync(videoFile)){
      let doWeContinue = await waitForFile(videoFile, messages, 300, 200);
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

async function fileReady(myRenderType){
  let fullFilename;
  let displayName
  let doUpload;
  let loadVideo;
  let settledCount;
  if (myRenderType == renderType.preview){
    adsMp4Details.folder = aeJson.specials.specials[aeName].aeRenderFolder;
    adsMp4Details.filename = aeJson.specials.specials[aeName].renderFilename;
    fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
    displayName = "Preview Mov";
    doUpload = true;
    loadVideo = true;
    settledCount = 5;
  } else if (myRenderType == renderType.sportPreview){
    adsMp4Details.folder = aeJson.specials.specials[aeName].aePackageFolder;
    adsMp4Details.filename = aeJson.specials.specials[aeName].aeMp4Filename;
    fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
    displayName = "Sports Preview mp4";
    loadVideo = true;
    settledCount = 5;
  } else if (myRenderType == renderType.proRes){
    adsMp4Details.folder = aeJson.specials.specials[aeName].aeProResFolder;
    adsMp4Details.filename = aeJson.specials.specials[aeName].aeProResFilename;
    fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
    displayName = "ProRes mov";
    loadVideo = false;
    settledCount = 30;
  } else if (myRenderType == renderType.text){
    adsMp4Details.folder = aeJson.specials.specials[aeName].aePackageFolder;
    adsMp4Details.filename = aeJson.specials.specials[aeName].textFilename;
    fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
    displayName = "Text file";
    loadVideo = false;
    settledCount = 5;
  } else if (myRenderType == renderType.avi){
    adsMp4Details.folder = aeJson.specials.specials[aeName].aePackageFolder;
    adsMp4Details.filename = aeJson.specials.specials[aeName].aeAviFilename;
    fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
    displayName = "Xpression AVI file";
    loadVideo = false;
    settledCount = 5;
  } else if (myRenderType == renderType.zip){
    adsMp4Details.folder = aeJson.specials.specials[aeName].aePackageFolder;
    adsMp4Details.filename = aeJson.specials.specials[aeName].packageFilename;
    fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
    displayName = "Package Zip File";
    loadVideo = false;
    settledCount = 5;
  } else if (myRenderType == renderType.serverPackage){
    let serverChoice = document.getElementById("ads-server");
    let serverSettings = await ads.readServerSettings(userPath, serverChoice.value);
    adsMp4Details.folder = serverSettings.packageFolder
    adsMp4Details.filename = aeJson.specials.specials[aeName].packageFilename;
    fullFilename = path.join(adsMp4Details.folder, adsMp4Details.filename);
    displayName = "Server Zip File";
    loadVideo = false;
    settledCount = 5;
  }
  let theResult = await waitForFileAE(fullFilename, displayName, loadVideo, settledCount)
  console.log(theResult);
  if (!doUpload){
    return theResult.result;
  } else {
    let finalMessages = []
    if (theResult.result){
      let serverChoice = document.getElementById("ads-server");
      let serverSettings = await ads.readServerSettings(userPath, serverChoice.value);
      let copySuccess = await ads.copyMp4ToServer(theResult.fullFilename, jsonAds, serverSettings);
      finalMessages.push(copySuccess.message);
      if (copySuccess.result){
        let updateSuccess= await ads.sendFileQueuedToWebApp(theResult.filename, jsonAds, serverSettings);
        finalMessages.push(updateSuccess.message);
        appendErrorList(finalMessages.join('\r\n'));
        return updateSuccess.result;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}
async function packageFileToServer(fullFilename){
  let serverChoice = document.getElementById("ads-server");
  let serverSettings = await ads.readServerSettings(userPath, serverChoice.value);
  let copySuccess = await ads.copyPackageToServer(fullFilename, serverSettings);
  appendErrorList(copySuccess.message);
  return copySuccess.result;
}

function checkboxValue(){
  let checkElement = document.getElementById('ads-periodic');
  return checkElement.checked
}

async function readLogFile(){
  let logs = await ads.readAeLogFile(theSettings);
  let testDate;
  if (!(aeStartTime == null)){
    testDate = aeStartTime;
  } else {
    testDate = subtractHours(new Date(),3);
  }
  
  console.log(logs);
  let count = 0;
  if (logs != null){
    for (let i=0; i < logs.length; i++){
      let logDate = new Date(logs[i].time)
      let message = formatTime(new Date(logs[i].time)) + ": " + logs[i].message;
      if (!alreadyExist(logs[i])){
        aeLog.push(logs[i]);
        count +=1;
        if (logDate > testDate){
          appendErrorList(message)
        }
      }
      if (logDate > testDate){
        console.log(message);
      }
      console.log(count);
    }
  }
  console.log(aeLog);
}

function alreadyExist(log){
  for (let i = 0; i < aeLog.length; i++){
    if ((aeLog[i].time == log.time) && (aeLog[i].message == log.message)){
      return true
    }
  }
  return false
}

function subtractHours(date, hours) {
  date.setHours(date.getHours() - hours);

  return date;
}

function formatTime(myTime){
  let h = myTime.getHours();
  if (h < 10){h = '0' + h};
  let m = myTime.getMinutes();
  if (m < 10){m = '0' + m};
  let s = myTime.getSeconds();
  if (s < 10){s = '0' + s};
  return h + ":" + m + ":" + s
}

async function getData(){

  let adsErrorList = document.getElementById("ads-error-list");
  adsErrorList.innerText = 'Creating data for After Effects'
  
  let adsVideo = document.getElementById("ads-video")
  adsVideo.style.display = "none";  

  let serverChoice = document.getElementById("ads-server");
  let isTestServer = (serverChoice.value == 'test');
  console.log("Server choice");
  console.log(serverChoice.value);
  console.log(isTestServer);

  console.log("IsMac");
  console.log(isMac)

  let serverSettings = await ads.readServerSettings(userPath, serverChoice.value);
  let myData;
  let apiSuccess;

  try {
    myData = await api.httpGet(serverSettings.url);
    apiSuccess = true;
    appendErrorList('Connected to server: ' + serverSettings.url);
  } catch (e){
    console.log("Cannot connect to server")
    appendErrorList('Cannot connect to server');
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
      appendErrorList('No special previews to render');
    } else {
      let description = ads.specialName(jsonAds);
      let descriptionElement = document.getElementById('ads-description');
      descriptionElement.innerText = description;

      let pageNumber = jsonAds.media_files.item[0].page[0];

      let theTemplate = await ads.findTemplate(userPath, jsonAds);
      if (theTemplate === undefined){
        appendErrorList('Cannot find template for page ' + pageNumber);
      } else {
        aeName = theTemplate.template.aeName;
        appendErrorList('Template name: ' + aeName);
        console.log("Ready for next bit")
        console.log(theTemplate);
        
        let renderDetails = await ads.createRenderDetails(userPath, jsonAds, theTemplate);
        console.log("Render Details");
        console.log(renderDetails);
        
        aeJson = await ads.createAeJson(userPath, jsonAds, theTemplate, theSettings, renderDetails);
        console.log ("This is the AE Json");
        console.log (aeJson);
        
        let mediaFilenames = await ads.mediaFields(userPath, jsonAds, false);
        let missingFiles = ads.missingMediaFiles(mediaFilenames);
        let success = {};
        success.result = true;
        if (missingFiles.length > 0){
          appendErrorList('Attempting to copy missing files');
          success = await ads.copyMissingFiles(userPath, missingFiles, isTestServer);
          appendErrorList(success.messages.join('\r\n'));
        }

        if (success.result){
          success.result = await ads.updateAeJobFile(aeJson.specials, theTemplate, renderDetails);
        }
        return success.result
       
      }   
    }
  }
}

async function doTheLot(){
  let result = await getData();
  if (result){
    startAfterFX();
    let previewReult = await fileReady(renderType.preview);
    if (previewReult){
      let previewMessage = "Preview rendered: " + aeJson.specials.specials[aeName].name
      await appendShortLog(previewMessage);
      let isSportsIpp = aeJson.specials.specials[aeName].sportsIpp;
      if (isSportsIpp == 'true'){
        let sportsPreviewResult = await fileReady(renderType.sportPreview)
        if (sportsPreviewResult){
          let proResResult = await fileReady(renderType.proRes);
          if (proResResult){
            let mediaEncoderResult = await isMediaEncoderRunning();
            console.log("Is Media Encoder running");
            console.log(mediaEncoderResult);
            if (!mediaEncoderResult){
              startMediaEncoder();
            }
            let textResult = await fileReady(renderType.text);
            if (textResult){
              let aviResult = await fileReady(renderType.avi);
              if(aviResult){
                let zipResult = await writeZip();
                if (zipResult.result){
                  let zipPresent = await fileReady(renderType.zip);
                  if (zipPresent){
                    console.log("Zip Result")
                    console.log(zipResult);
                    let copyServer = await packageFileToServer(zipResult.zipFilename);
                    if (copyServer){
                      let serverPresent = await fileReady(renderType.serverPackage)
                      if (serverPresent){
                        let serverChoice = document.getElementById("ads-server");
                        let serverSettings = await ads.readServerSettings(userPath, serverChoice.value);
                        let updateSuccess = await ads.sendPackageUploadedToWebApp(jsonAds, serverSettings);
                        appendErrorList(updateSuccess.message);
                      }
                    }
                  }
                }
                  
              }
            }
          }
        }
      }
    }
  }
  return true;
}

async function fileSizeSettled(fullFilename, lastSize, sizeCount, settledCount){
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
      if (sizeCount > settledCount){
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

async function asyncInterval(callback, fullFilename, theMessages, ms, triesLeft = 200, settledCount = 5){
  let myResult = {};
  myResult.lastSize = 0;
  myResult.sizeCount = 0;
  return new Promise((resolve, reject) => {
    const interval = setInterval(async () => {
      myResult = await callback(fullFilename, myResult.lastSize, myResult.sizeCount, settledCount)
      let myMessages = theMessages.slice();
      myMessages.push("Filesize: "+ myResult.lastSize);
      //theElement.innerText += "\r\n" + myMessages.join('\r\n');
      console.log(myResult);
      if (myResult.done) {
        resolve();
        clearInterval(interval);
        let myMessages = theMessages.slice();
        myMessages.push("File ready");
        appendErrorList(myMessages.join('\r\n'));
      } else if (triesLeft <= 1) {
        reject();
        clearInterval(interval);
        let myMessages = theMessages.slice();
        myMessages.push("File timeout");
        appendErrorList(myMessages.join('\r\n'));
      } else {
        appendErrorList(".", false);
      }
      triesLeft--;
      console.log("Tries left: " + triesLeft)
    }, ms);
  });
}

async function waitForFile(fullFilename, theMessages, msInterval, triesLeft, settledCount){
  try {
    console.log(await asyncInterval(fileSizeSettled, fullFilename, theMessages, msInterval, triesLeft, settledCount));
  } catch (e) {
    console.log("Error");
    return false
  }
  console.log("Done!");
  return true
}

async function waitForFileExist(fullFilename, msInterval, triesLeft ){
  try {
    console.log(await asyncExistInterval(theFileExists, fullFilename, msInterval, triesLeft));
  } catch (e) {
    console.log("Error. File Exists!");
    return false;
  }
  console.log("Done! File exists");
  return true;
}

async function asyncExistInterval(myFileExists, fullFilename, msInterval, triesLeft = 10){
  return new Promise((resolve, reject) => {
    const theInterval = setInterval(async () => {
      await readLogFile();
      myResult = await myFileExists(fullFilename);
      if (myResult){
        resolve();
        clearInterval(theInterval);
        appendErrorList('File present');
      } else if (triesLeft <= 1){
        reject();
        clearInterval(theInterval);
        appendErrorList('File not present. Timeout');
      }
      triesLeft--;
      console.log("Tries left: " + triesLeft);
      appendErrorList(".", false);
    }, msInterval);
  });

}

async function theFileExists(fullFilename){
  return fs.existsSync(fullFilename);
}

function runWindowsBat(path){
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
  appendErrorList('Running After Effects');
  console.log("Running After Effects")
  runWindowsBat(afterFxBat);
  aeStartTime = new Date();
  console.log(aeStartTime);
}

function startMediaEncoder(){
  appendErrorList('Running Media Encoder');
  console.log("Running Media Encoder")
  runWindowsBat(mediaEncoderBat);
}

async function whatIsRunning(){
  let apps=[];
  let mySources = await desktopCapturer.getSources({types: ['window', 'screen']})
  for (const thisSource of mySources) {
    console.log(thisSource.name);
    apps.push(thisSource.name);
  }
  console.log('+++++');
  console.log(apps.length);
  return apps;
}

async function isMediaEncoderRunning(){
  let apps = await whatIsRunning()
  console.log("Apps")
  console.log(apps)
  console.log('=====')
  console.log(apps instanceof Array)
  for (let i = 0; i < apps.length; i++){
    console.log(apps[i]);
    if (apps[i] == 'Adobe Media Encoder 2023'){
      console.log("It is")
      return true;
    }
  }
  console.log("It is NOT")
  return false;
}

async function writeZip(){
  appendErrorList('Creating Zip');
  var AdmZip = require('adm-zip')

  let mp4Filename = path.join(aeJson.specials.specials[aeName].aePackageFolder, aeJson.specials.specials[aeName].aeMp4Filename);
  let textFilename = path.join(aeJson.specials.specials[aeName].aePackageFolder, aeJson.specials.specials[aeName].textFilename);
  let aviFilename = path.join(aeJson.specials.specials[aeName].aePackageFolder, aeJson.specials.specials[aeName].aeAviFilename);  
  let zipFilename = path.join(aeJson.specials.specials[aeName].aePackageFolder, aeJson.specials.specials[aeName].packageFilename);  

  let zip = new AdmZip();
  zip.addLocalFile(mp4Filename);
  zip.addLocalFile(textFilename);
  zip.addLocalFile(aviFilename);
  let result = await zip.writeZipPromise(zipFilename)
  return {result: result, zipFilename: zipFilename};
}

async function appendLog(message){
  if (message != '.'){
    let logFolder = path.join(userPath, 'logs');
    let now = new Date
    let logFilenameWithDate = formatDate(now, logFilename);
    let myJsonFile = path.join(logFolder,logFilenameWithDate);
    let myJson = []
  
    if (!fs.existsSync(logFolder)){
      console.log("Folder does not exist")
      fs.mkdirSync(logFolder, { recursive: true })
      console.log("Folder created")
    }
    if (!fs.existsSync(myJsonFile)){
      console.log("File does not exist")
    } else {
      let currentJson = fs.readFileSync(myJsonFile);
      myJson = JSON.parse(currentJson);
      console.log("File exists")
      console.log(myJson)
    }
  
    let thisMessage = {}
    thisMessage.date = now
    thisMessage.message = message
    myJson.push(thisMessage)
    let theJson = JSON.stringify(myJson, null, 2)
    
    fs.writeFileSync(myJsonFile, theJson);
  
    console.log("MyJsonFile")
    console.log(myJsonFile)
  }
}

async function appendShortLog(message){
  if (message != '.'){
    let logFolder = userPath + '\\logs\\';
    let now = new Date
    let logFilenameWithDate = formatDate(now, shortLogFilename);
    let myJsonFile = logFolder + logFilenameWithDate;
    let myJson = []
  
    if (!fs.existsSync(logFolder)){
      console.log("Folder does not exist")
      fs.mkdirSync(logFolder, { recursive: true })
      console.log("Folder created")
    }
    if (!fs.existsSync(myJsonFile)){
      console.log("File does not exist")
    } else {
      let currentJson = fs.readFileSync(myJsonFile);
      myJson = JSON.parse(currentJson);
      console.log("File exists")
      console.log(myJson)
    }
    let serverChoice = document.getElementById("ads-server");
    let thisMessage = {}
    thisMessage.date = now;
    thisMessage.message = message;
    thisMessage.server = serverChoice.value;
    myJson.push(thisMessage)
    let theJson = JSON.stringify(myJson, null, 2)
    console.log(theJson);
    fs.writeFileSync(myJsonFile, theJson);
  
    console.log("MyJsonFile")
    console.log(myJsonFile)
  }
}



 /**
   * 
   * @param {Date} theDate 
   * @param {string} theString 
   * @returns {string}
   */
 function formatDate(theDate, theString){
  var yearString = theDate.getFullYear().toString();
  theString = theString.replace("YYYY", yearString);
  var month = theDate.getMonth() + 1 ;
  var monthString;
  if (month < 10){
    monthString = "0" + month.toString();
  } else {
    monthString = month.toString();
  }
  theString = theString.replace("MM",monthString);
  var day = theDate.getDate();
  var dayString;
  if (day < 10){
    dayString = "0" + day.toString();
  } else {
    dayString = day.toString();
  }
  return theString.replace("DD", dayString);
}

