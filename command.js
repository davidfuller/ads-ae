const mediaPlayer = require('./player.js');
const comms = require('./streamMasterCommunication.js');
const events = require('events');
const xmlToJson = require('./genericXmlJson.js');
const pixelLog = require('./pixelLog.js');
const netSMB2 = require('./netSMB2.js');
const xmlStrings = require('./xmlStrings');
const tc = require('./timecode.js');
const path = require('path');
const settings = require('./settings')

let userPath;
let theSettings = {};
ipcRenderer.send("getUserPath");

ipcRenderer.on("userPath", (event,data) => {
  userPath = data;
  ipcRenderer.send("getSettings");
})


ipcRenderer.on("receiveSettings", async () => {
  theSettings = await settings.readSettings(userPath);
})


/**
 * 
 * @param {string} triggerId 
 * @param {number} subDevice
 * @param {boolean} playNow 
 * @param {string} timecode  
 * @returns {CommandResponse[]}
*/
async function playBlack(triggerId, subDevice, playNow, timecode){
    /**
     * @type {CommandResponse[]}
     */
    let result = [];
    result = await playSystem(triggerId, 'BLACK', '1', subDevice, playNow, timecode, 'Black');
    return result;
}

/**
 * 
 * @param {string} triggerId 
 * @param {number} subDevice 
 * @param {boolean} playNow 
 * @param {string} timecode 
 * @returns {CommandResponse[]}
*/
async function playTest(triggerId, subDevice, playNow, timecode){
    /**
     * @type {CommandResponse[]}
     */
    
    let result = [];
    result = await playSystem(triggerId, 'TESTSIGNAL', '7', subDevice, playNow, timecode, 'Test Signal');
    return result;
}
/**
 * 
 * @param {string} ppwlFilename 
 * @param {string} triggerId
 * @param {number} subDevice  
 * @param {boolean} playNow 
 * @param {string} timecode 
 * @returns 
*/
async function playPpwl(ppwlFilename, triggerId, subDevice, playNow, timecode){
  /**
   * @type {CommandResponse[]}
   */
   let result = [];
   let ppwlXML = xmlStrings.createPpwlXML(ppwlFilename, triggerId, playNow, timecode);
   result.push(await genericSendCommand(ppwlXML, subDevice, 'Play PPWL' ));

   if (triggerId != '' && playNow){
    let triggerStuff = mediaPlayer.triggerPlay(triggerId);
    result.push(await genericSendCommand(triggerStuff, subDevice, 'Play Page PPWL Trigger'));
  }

   return result;
}

 /**
 * 
 * @param {string} ppwgData 
 * @param {string} jobPath 
 * @param {string} triggerId 
 * @param {number} subDevice 
 * @param {boolean} playNow 
 * @param {string} timecode 
 * @returns {CommandResponse[]}
*/
async function playPagePpwg(ppwgData, jobPath, triggerId, subDevice, playNow, timecode){
  /**
   * @type {CommandResponse[]}
   */
  let result = [];

  result = await cuePagePpwg(ppwgData, jobPath, triggerId, subDevice, playNow, timecode);
  
  if (triggerId != '' && playNow){
    let triggerStuff = mediaPlayer.triggerPlay(triggerId);
    result.push(await genericSendCommand(triggerStuff, subDevice, 'Play Page PPWG Trigger'));
  }

  return result;

}
/**
 * 
 * @param {string} ppwgData 
 * @param {string} jobPath 
 * @param {string} triggerId 
 * @param {number} subDevice 
 * @param {boolean} playNow 
 * @param {string} timecode 
 * @returns {CommandResponse[]}
 */
 async function cuePagePpwg(ppwgData, jobPath, triggerId, subDevice, playNow, timecode){
  /**
   * @type {CommandResponse[]}
   */
  let result = [];
    
  let assetString = xmlStrings.ppwgToAsset(jobPath, ppwgData);
  let pageXML = xmlStrings.createPageXML(assetString, triggerId, playNow, timecode);
  
  result.push(await genericSendCommand(pageXML, subDevice, 'Cue Page PPWG'));

  return result;
}
  
  /**
 * 
 * @param {string} triggerId 
 * @param {string} source 
 * @param {source} index 
 * @param {number} subDevice 
 * @param {boolean} playNow 
 * @param {string} timecode 
 * @param {string} logMessage
 * @returns {CommandResponse[]}
*/
async function playSystem(triggerId, source, index, subDevice, playNow, timecode, logMessage){
  /**
   * @type {CommandResponse[]}
   */
  let result = [];
  
  var layerXML = mediaPlayer.setLayerStates(triggerId, '', 'VA', '0', source, index, playNow, timecode);
  result.push(await genericSendCommand(layerXML, subDevice, 'Play System Set Layer: ' + logMessage));
  
  if (triggerId != '' && playNow){
    /**
   * @type {CommandResponse[]}
   */
    let triggerResult = [];
    let triggerXML = mediaPlayer.triggerPlay(triggerId);
    triggerResult.push(await genericSendCommand(triggerXML, subDevice, 'Play System Trigger: '+ logMessage));
    result.push(...triggerResult);
  }
  return result;
}
/**
 * 
 * @param {BackgroundMedia} myMedia 
 * @param {string} loop 
 * @param {string} subDevice 
 * @param {boolean} playNow
 * @param {string} timecode
 * @returns {CommandResponse[]}
*/
async function playClipMedia(myMedia, loop, subDevice, playNow, timecode){
  /**
   * @type {CommandResponse[]}
   */
  let result = [];
  
  result.push(...await cueMedia(myMedia, loop, subDevice, playNow, timecode));

  if (myMedia.triggerId != '' && playNow){
    let triggerStuff = mediaPlayer.triggerPlay(myMedia.triggerId);
    result.push(await genericSendCommand(triggerStuff, subDevice, 'Trigger Play Clip Media'));
  }
  
  return result;

}
/**
 * 
 * @param {BackgroundMedia} myMedia 
 * @param {string} loop 
 * @param {number} subDevice
 * @param {boolean} playNow
 * @param {string} timecode
 * @return {CommandResponse[]}}
*/
async function cueMedia(myMedia, loop, subDevice, playNow, timecode){
  /**
   * @type {CommandResponse[]}
   */
  let result = [];
 
  let attachMediaXML = mediaPlayer.attachMedia(myMedia, loop);
  result.push(await genericSendCommand(attachMediaXML, subDevice, 'Attach Media'));
  
  let layerXML = mediaPlayer.setLayerStates(myMedia.triggerId, myMedia.playerId, 'V', '0', 'VCLIP', '0', playNow, timecode);
  result.push(await genericSendCommand(layerXML, subDevice, 'Set Media Layer'));
  
  let mediaPlayXML = mediaPlayer.mediaPlay(myMedia.triggerId, myMedia.playerId, playNow, timecode);
  result.push(await genericSendCommand(mediaPlayXML, subDevice, 'Set Media Player'));
  
  return result;
}

async function playOutOverTest(workDetailsFilenameUNC, currentConfig){
  let theCommand  = {};
  let result = [];
  theCommand.commandName = 'Playout Page Over Test Background from Workfile'
  let myWorkDetails = await readWorkDetails(workDetailsFilenameUNC);
  theCommand.workDetailsFilename = workDetailsFilenameUNC;
  let myPageDetails = await readPageDetails(myWorkDetails.pageDetailsFilename);
  let myPPWG = await readPPWG(myWorkDetails.ppwgFilename);
  theCommand.ppwgFilename = myWorkDetails.ppwgFilename;
  result.push(...await playTest(myPageDetails.triggerId, currentConfig.playoutSubDevice, true, ''));
  result.push(...await playPagePpwg(myPPWG, myPageDetails.jobPath, myPageDetails.triggerId, currentConfig.playoutSubDevice, true, ''));
  
  return {result: result, theCommand: theCommand};
    
}

async function playOut(workDetailsFilenameUNC, currentConfig){
  let theCommand  = {}
  let result = [];
  theCommand.commandName = 'Playout Page and Background from Workfile'
  let myWorkDetails = await readWorkDetails(workDetailsFilenameUNC);
  theCommand.workDetailsFilename = workDetailsFilenameUNC;
  let myPageDetails = await readPageDetails(myWorkDetails.pageDetailsFilename);
  theCommand.pageDescription = myPageDetails.description;
  let myBackgroundMedia = await readBackgroundMedia(myWorkDetails.backgroundMediaFilename);
  theCommand.backgroundMediaFilename = myBackgroundMedia.filename;
  let myPPWG = await readPPWG(myWorkDetails.ppwgFilename);
  theCommand.ppwgFilename = myWorkDetails.ppwgFilename;
  theCommand.ppwlDetailsFilename = myWorkDetails.ppwlDetailsFilename;
  let myPpwlDetails = []
  if (myWorkDetails.ppwlDetailsFilename != ''){
    myPpwlDetails = await readPpwlDetails(myWorkDetails.ppwlDetailsFilename)
  }
  let timelineStart = tc.nowPlusTimecode(5);
  theCommand.timecodeStart = timelineStart;
  let possibleBackgroundEOM = tc.timecodeAdd(myBackgroundMedia.som, myPageDetails.eom);
  if (tc.timecodeGreaterThan(myBackgroundMedia.eom, possibleBackgroundEOM)){
    myBackgroundMedia.eom = possibleBackgroundEOM;
  }
  let pageStart = tc.timecodeAdd(timelineStart, myPageDetails.startTimecode);
  let playoutEnd = tc.timecodeAddSeconds(tc.timecodeAdd(timelineStart, myPageDetails.eom), 0);
  theCommand.playoutEnd = playoutEnd;
  if (myPpwlDetails != undefined){
    for (const theDetail of myPpwlDetails){
      let theTimecode = tc.timecodeAdd(theDetail.timecode, timelineStart);
      result.push(...await playPpwl(theDetail.ppwlFilename, 'logo', currentConfig.playoutSubDevice, false, theTimecode));
    }
  }
  result.push(...await playClipMedia(myBackgroundMedia, 'NoLoop', currentConfig.playoutSubDevice, false, timelineStart));
  result.push(...await playPagePpwg(myPPWG, myPageDetails.jobPath, myPageDetails.triggerId, currentConfig.playoutSubDevice, false, pageStart));
  result.push(...await playTest(myPageDetails.triggerId, currentConfig.playoutSubDevice, false, playoutEnd));

  return {result: result, theCommand: theCommand};
}

async function playoutPageNumber(pageNumber, currentConfig){
  let pageDetails = getPage(pageNumber);
  if (pageDetails.pageNumber != '0'){
    let temp = await playOut(pageDetails.pageFilename, currentConfig);
    temp.theCommand.pageNumber = pageDetails.pageNumber;  
    return temp;
  }
}

function getPage(pageNumber){
  let filename = path.join(theSettings.pageWorkDetailsFolderUNC, theSettings.pageWorkDetailsFilename)
  let pageFilename = filename.replace('XXXX', pageNumber.padStart(4,'0'));
  return {pageNumber: pageNumber, pageFilename: pageFilename}
}

async function playoutPageNumberOverTest(pageNumber, currentConfig){
  let pageDetails = getPage(pageNumber);
  if (pageDetails.pageNumber != '0'){
    let temp = await playOutOverTest(pageDetails.pageFilename, currentConfig);      
    return temp;
  }
}

/**
 * @async
 * @param {string} commandXML
 * @param {number} subDevice
 * @param {string} logName
 * @returns {CommandResponse}
 */
async function genericSendCommand(commandXML, subDevice, logName){
    /**
     * 
     * @type {StreamMasterLog[]}
     */
    let theLog = []
    /**
     * @type {CommandResponse}
     */
    let response = {}
  
    let eventGeneric = new events.EventEmitter();
    comms.sendCommand(commandXML, eventGeneric, subDevice);
    let result = await waitForEvent(eventGeneric, 'closed');
    eventGeneric.removeAllListeners('closed');
  
    let temp = xmlToJson.parseXML(result);
    theLog.push(pixelLog.pixelLog(temp, logName));
  
    response.xml = result
    response.log = theLog
  
    return response;
  }

function waitForEvent(emitter, event){
    return new Promise((resolve, reject) => {
        emitter.once(event, resolve);
        emitter.once("error", reject);        
    });
}

/**
 * 
 * @param {string} filename 
 * @returns {WorkDetails}
*/
async function readWorkDetails(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename)
  let theWorkDetails = await netSMB2.readJson(server, path);
  return theWorkDetails
    
}
/**
 * 
 * @param {string} filename 
 * @returns {PageDetails}
 */
 async function readPageDetails(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename)
  let thePageDetails = await netSMB2.readJson(server, path);
  return thePageDetails
}
/**
 * 
 * @param {string} filename 
 * @returns {string}
 */
 async function readPPWG(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename);
  let xmlString = await netSMB2.readXML(server, path);
  return xmlString;
}
/**
 * 
 * @param {string} filename 
 * @returns {BackgroundMedia}
 */
 async function readBackgroundMedia(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename);
  let theBackground = await netSMB2.readJson(server, path);
  return theBackground;
}

/**
 * 
 * @param {string} filename 
 * @returns {object}
*/
async function readPpwlDetails(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename)
  let thePpwlDetails = await netSMB2.readJson(server, path);
  return thePpwlDetails
}

async function getPageNumberAndNameDetails(folderUNC){
  let theFiles = await readDirectory(folderUNC);
  let result = []
  theFiles.sort();
  let filteredFiles = theFiles.filter(theFile => theFile.match(/^Work_Details.*.json$/i));
  for (const myFile of filteredFiles){
    let myWorkDetails = await readWorkDetails(path.join(folderUNC, myFile));
    let myPage ={}
    myPage.txPageNumber = myWorkDetails.txPageNumber;
    myPage.pageName = myWorkDetails.pageName;
    myPage.jpegFilenameBase = myWorkDetails.jpegFilenameBase;
    myPage.mp4Folder = myWorkDetails.mp4Folder;
    myPage.mp4FilePattern = myWorkDetails.mp4FilePattern;
    myPage.folder = folderUNC;
    myPage.filename = myFile;
    result.push(myPage)
  }
  return result
}

/**
 * 
 * @param {string} folderName 
 * @returns {string[]}
 */
async function readDirectory(folderName){
  let server = netSMB2.findMyServer(folderName);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(folderName)
  let files = await netSMB2.readDir(server, path);
  return files
}

/**
 * 
 * @param {string} filename 
 * @returns {string}
 */
async function readJpeg(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename);
  let jpeg = await netSMB2.readJpeg(server, path);
  return jpeg
}
async function clearJpegFolder(workDetailsFilenameUNC){
  let myWorkDetails = await readWorkDetails(workDetailsFilenameUNC);
  let myJpegDetails = await readJpegDetails(myWorkDetails.jpegDetailsFilename);
  await emptyFolder(myJpegDetails.filenameBase)
}

async function emptyFolder(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename);
  let paths = netSMB2.splitPath(path);
  if (paths.length >= 0){
    let jpegFolder = paths[paths.length-1];
    let files = await netSMB2.readDir(server, jpegFolder);
    if (files != null){
      for (const thefile of files){
        let filePath = jpegFolder + '\\' + thefile;
        await netSMB2.deleteFile(server, filePath);
      }
    }
  }
}
/**
 * @param {string} filename 
 * @returns {JpegDetails}
 */
 async function readJpegDetails(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename)
  let theJpegDetails = await netSMB2.readJson(server, path);
  return theJpegDetails
}
async function exportJpegFromWorkfile(workDetailsFilenameUNC){
  let theCommand  = {}
  let result = [];
  theCommand.commandName = 'Export JPEG from workfile'
  let myWorkDetails = await readWorkDetails(workDetailsFilenameUNC);
  theCommand.workDetailsFilename = workDetailsFilenameUNC;
  let myPageDetails = await readPageDetails(myWorkDetails.pageDetailsFilename);
  let myJpegDetails = await readJpegDetails(myWorkDetails.jpegDetailsFilename);
  let xmlString = await readPPWG(myJpegDetails.ppwgFilename);
  theCommand.ppwgFilename = myJpegDetails.ppwgFilename;
  myPageDetails = xmlStrings.pageDetailsFromPPWG(xmlString, myPageDetails);
  theCommand.pageNumber = myWorkDetails.txPageNumber
  result.push(...await exportJpegsFromPPWG(myPageDetails, myJpegDetails));
  let jpegResult = await extractImages(result[0].xml, myJpegDetails.filenameBase)
  theCommand.filenames = jpegResult; 
  return {result: result, theCommand: theCommand};
}

/**
 * 
 * @param {PageDetails} pageDetails 
 * @param {JpegDetails} jpegDetails 
 * @returns {CommandResponse[]}
*/
async function exportJpegsFromPPWG(pageDetails, jpegDetails)
{
  /**
  * @type {CommandResponse[]}
  */
  let result = [];
  
  let requestXML = xmlStrings.imageXMLPPWG(pageDetails, jpegDetails.width, jpegDetails.height)
  result.push(await genericSendCommand(requestXML, jpegDetails.renderSubDevice, 'Export JPEGs from PPWG'));
  
  return result
}
/**
 * 
 * @param {string} xmlString 
 * @param {string} imageFilenameBase 
 * @returns {string[]}
*/
async function extractImages(xmlString, imageFilenameBase){
//Looks for <ImageData></ImageData> and extracts the text in between

  var start;
  var end;
  let num = 0;
  let buff;
  let result;
  let filename;
  let filenames = []

  let server = netSMB2.findMyServer(imageFilenameBase);
  server.ipShare = await netSMB2.getIPShare(server);

  start = xmlString.indexOf(xmlStrings.imageDataTag.open);
  end = xmlString.indexOf(xmlStrings.imageDataTag.close, start);

  while (start != -1 && num < 10){
    buff = Buffer.from(xmlString.substring(start + xmlStrings.imageDataTag.open.length, end), 'base64');
    filename = imageFilenameBase + '_' + num + '.jpg';
    filenames.push(filename);
    let path = netSMB2.findMyPath(filename)
    
    result =  await netSMB2.writeJpeg(server, path, buff);
    //console.log(result);
    //console.log(num, start, end);
    num += 1
    start = xmlString.indexOf(xmlStrings.imageDataTag.open, end);
    end = xmlString.indexOf(xmlStrings.imageDataTag.close, start);
  }
  return filenames;
 
}


module.exports = {playBlack, playTest, playOutOverTest, playOut, playoutPageNumber, playoutPageNumberOverTest, getPageNumberAndNameDetails, readJpeg, readDirectory, clearJpegFolder, exportJpegFromWorkfile}