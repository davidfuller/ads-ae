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
const movieRender = require('./movieRender')

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
  console.log('Cue Page XML');
  console.log(pageXML);
  
  result.push(await genericSendCommand(pageXML, subDevice, 'Cue Page PPWG'));

  return result;
}

/**
 * 
 * @param {number} subDevice 
 * @returns {CommandResponse[]}
 */
async function clearKeyer(subDevice){
  /**
   * @type {CommandResponse[]}
  */
  let result = [];
  let pageXML = xmlStrings.createClearKeyerXML();
  console.log(pageXML);
  result.push(await genericSendCommand(pageXML, subDevice, 'Clear Keyer'));

  return result;
}

/**
 * 
 * @param {number} subDevice 
 * @param {string} triggerId
 * @returns {CommandResponse[]}
 */

async function eventAbort(subDevice, triggerId){
  /**
   * @type {CommandResponse[]}
  */
   let result = [];
   let abortXML = mediaPlayer.abortEvent(triggerId);
   console.log(abortXML);
   result.push(await genericSendCommand(abortXML, subDevice, 'Abort Event'));
 
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
  console.log(myWorkDetails.ppwlDetailsFilename);
  if (myWorkDetails.ppwlDetailsFilename != '' && myWorkDetails.ppwlDetailsFilename != undefined){
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

async function playOutFromFullDetails(fullDetailsFilenameUNC, currentConfig){
  let theCommand  = {}
  let result = [];
  theCommand.commandName = 'Playout Page and Background from Workfile'
  let myFullDetails = await readFullDetails(fullDetailsFilenameUNC);
  theCommand.fullDetailsFilename = fullDetailsFilenameUNC;
  let myPageDetails = myFullDetails.pageDetails;
  theCommand.pageDescription = myPageDetails.description;
  let myBackgroundMedia = myFullDetails.backgroundDetails
  theCommand.backgroundMediaFilename = myBackgroundMedia.filename;
  let myPPWG = await readPPWG(myFullDetails.ppwgFilename);
  theCommand.ppwgFilename = myFullDetails.ppwgFilename;
  theCommand.ppwlDetailsFilename = myFullDetails.ppwlDetailsFilename;
  let myPpwlDetails = []
  if (myFullDetails.ppwlDetailsFilename != '' && myFullDetails.ppwlDetailsFilename != undefined){
    myPpwlDetails = await readPpwlDetails(myFullDetails.ppwlDetailsFilename)
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
    let result;
      
    try{
      let eventGeneric = new events.EventEmitter();
      await comms.sendCommand(commandXML, eventGeneric, subDevice);
      console.log("After sendCommand")
      
      result = await waitForEvent(eventGeneric, 'closed');
      console.log("Got result")
      console.log(result)
      
     
      eventGeneric.removeAllListeners('closed');
    
      let temp = xmlToJson.parseXML(result);
      theLog.push(pixelLog.pixelLog(temp, logName));
    
      response.xml = result
      response.log = theLog
  
    } catch (myError){
      if (myError.code == 'ECONNREFUSED'){
        theLog.push(pixelLog.connectionErrorLog(logName, subDevice))
        response.xml = "";
        response.log = theLog;
      }
    }
    return response;
  }

async function waitForEvent(emitter, event){
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
  console.log(path);
  let xmlString = await netSMB2.readXML(server, path);
  return xmlString;
}
/**
 * 
 * @param {string} filename 
 * @returns {BackgroundMedia}
 */
 async function readBackgroundMedia(filename){
  console.log(filename);
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

/**
 * 
 * @param {string} filename 
 * @returns {RenderDetails}
 */
 async function readRenderDetails(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename)
  let theRenderDetails = await netSMB2.readJson(server, path);
  return theRenderDetails;
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

async function exportJpegFromFullDetailsFile(fullDetailsFilenameUNC){
  let theCommand  = {}
  let result = [];
  theCommand.commandName = 'Export JPEG from workfile'
  let myFullDetails = await readFullDetails(fullDetailsFilenameUNC);
  theCommand.fullDetailsFilename = fullDetailsFilenameUNC;
  let myPageDetails = myFullDetails.pageDetails;
  let myJpegDetails = myFullDetails.jpegDetails;
  let xmlString = await readPPWG(myJpegDetails.ppwgFilename);
  theCommand.ppwgFilename = myJpegDetails.ppwgFilename;
  myPageDetails = xmlStrings.pageDetailsFromPPWG(xmlString, myPageDetails);
  theCommand.pageNumber = myPageDetails.page
  console.log("++++++++++++++++++++")
  console.log(theCommand.pageNumber);
  result.push(...await exportJpegsFromPPWG(myPageDetails, myJpegDetails));
  let jpegResult = await extractImages(result[0].xml, myJpegDetails.filenameBase)
  theCommand.filenames = jpegResult; 
  return {result: result, theCommand: theCommand};
}

async function exportJpegFromFullDetails(fullDetails){
  let theCommand  = {}
  let result = [];
  theCommand.commandName = 'Export JPEG from workfile'
  let myFullDetails = fullDetails
  let myPageDetails = myFullDetails.pageDetails;
  let myJpegDetails = myFullDetails.jpegDetails;
  let xmlString = await readPPWG(myJpegDetails.ppwgFilename);
  theCommand.ppwgFilename = myJpegDetails.ppwgFilename;
  myPageDetails = xmlStrings.pageDetailsFromPPWG(xmlString, myPageDetails);
  theCommand.pageNumber = myPageDetails.page
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

async function exportMp4FromWorkfile(workDetailsFilenameUNC){
  let theCommand  = {};
  let result = [];
  theCommand.commandName = 'Export mp4 from workfile';
  let myWorkDetails = await readWorkDetails(workDetailsFilenameUNC);
  if (myWorkDetails != null){
    theCommand.workDetailsFilename = workDetailsFilenameUNC;
    let myRenderDetails = await readRenderDetails(myWorkDetails.renderDetailsFilename);
    let myPageDetails = await readPageDetails(myWorkDetails.pageDetailsFilename);
    let myBackgroundMedia = await readBackgroundMedia(myWorkDetails.backgroundMediaFilename);
    let myPpwlDetails = []
    if (myWorkDetails.ppwlDetailsFilename != '' && myWorkDetails.ppwlDetailsFilename != undefined){
      myPpwlDetails = await readPpwlDetails(myWorkDetails.ppwlDetailsFilename)
    }
    let dateString = new Date().toISOString().replace(/T|:|-/g, '_').substring(0, 19)
    myRenderDetails.filePattern = myRenderDetails.filePattern.replace('%d', dateString)
    let xmlString = await readPPWG(myWorkDetails.ppwgFilename);
    theCommand.ppwgFilename = myWorkDetails.ppwgFilename;
    myPageDetails = xmlStrings.pageDetailsFromPPWG(xmlString, myPageDetails);
    console.log(theSettings.currentConfig)
    theSettings.blackDetails.startTimecode = tc.timecodeAdd(myPageDetails.startTimecode, myPageDetails.eom)
    let testResult = await cuePagePpwg(xmlString, myPageDetails.jobPath, myPageDetails.triggerId, theSettings.currentConfig.playoutSubDevice, false, '');
    if (hasAnyErrors(testResult)){
      result = testResult
    } else {
      if (createMp4FolderIfNotExist(myRenderDetails.folder)){
        result = await command.renderMovie(theSettings.currentConfig, myBackgroundMedia, myPageDetails, theSettings.blackDetails, myRenderDetails, myPpwlDetails); 
      }
      theCommand.renderFolder = myRenderDetails.folder;
      theCommand.renderFilename = myRenderDetails.filePattern;
    }
  }
  return {result: result, theCommand: theCommand};
}

async function exportMp4FromFullDetailsFile(fullDetailsFilenameUNC){
  let theCommand  = {};
  let result = [];
  theCommand.commandName = 'Export mp4 from workfile';
  let myFullDetails = await readFullDetails(fullDetailsFilenameUNC);
  if (myFullDetails != null){
    theCommand.fullDetailsFilename = fullDetailsFilenameUNC;
    let myRenderDetails = myFullDetails.renderDetails;
    let myPageDetails = myFullDetails.pageDetails;
    let myBackgroundMedia = myFullDetails.backgroundDetails;
    let myPpwlDetails = []
    if (myFullDetails.ppwlDetailsFilename != '' && myFullDetails.ppwlDetailsFilename != undefined){
      myPpwlDetails = await readPpwlDetails(myFullDetails.ppwlDetailsFilename)
    }
    let dateString = new Date().toISOString().replace(/T|:|-/g, '_').substring(0, 19)
    myRenderDetails.filePattern = myRenderDetails.filePattern.replace('%d', dateString)
    let xmlString = await readPPWG(myFullDetails.ppwgFilename);
    theCommand.ppwgFilename = myFullDetails.ppwgFilename;
    myPageDetails = xmlStrings.pageDetailsFromPPWG(xmlString, myPageDetails);
    console.log(theSettings.currentConfig)
    theSettings.blackDetails.startTimecode = tc.timecodeAdd(myPageDetails.startTimecode, myPageDetails.eom)
    //let clearResult = await clearKeyer(theSettings.currentConfig.playoutSubDevice);
    //console.log('Clear Keyer');
    //console.log(clearResult);
    let testResult = await cuePagePpwg(xmlString, myPageDetails.jobPath, myPageDetails.triggerId, theSettings.currentConfig.playoutSubDevice, false, '');
    if (hasAnyErrors(testResult)){
      result = testResult
    } else {
      console.log('Event Abort');
      let abortResult = await eventAbort(theSettings.currentConfig.playoutSubDevice, myPageDetails.triggerId);
      console.log(abortResult);
      if (createMp4FolderIfNotExist(myRenderDetails.folder)){
        result = await command.renderMovie(theSettings.currentConfig, myBackgroundMedia, myPageDetails, theSettings.blackDetails, myRenderDetails, myPpwlDetails); 
      }
      theCommand.renderFolder = myRenderDetails.folder;
      theCommand.renderFilename = myRenderDetails.filePattern;
    }
  }
  return {result: result, theCommand: theCommand};
}

function hasAnyErrors(theResult){
  for (const tempResult of theResult){
    for (const theLog of tempResult.log){
      if (theLog.hasError){
        return true;
      }
    }
  }
  return false;
}

async function createMp4FolderIfNotExist(folder){
  let server = netSMB2.findMyServer(folder);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(folder);
  let client = await netSMB2.getServer(server);
  if (client != null){
    if (await netSMB2.createPathIfNotExist(path, client)){
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
/**
 * 
 * @param {CurrentConfig} currentConfig 
 * @param {BackgroundMedia} backgroundMedia 
 * @param {PageDetails} pageDetails 
 * @param {BlackDetails} blackDetails 
 * @param {RenderDetails} renderDetails 
 * @returns {CommandResponse []}
 */
 async function renderMovie(currentConfig, backgroundMedia, pageDetails, blackDetails, renderDetails, myPpwlDetails){
  /**
   * @type {CommandResponse[]}
   */
  let result = [];
  let subDevice = currentConfig.renderSubDevice;

  let profileXML = movieRender.setMediaProfile(path.join(userPath, currentConfig.mediaProfilesFilename));
  result.push(await genericSendCommand(profileXML, subDevice, 'Set Media Profile'));
  
  let configXML = movieRender.setMediaProfile(path.join(userPath, currentConfig.configFilename));
  result.push(await genericSendCommand(configXML, subDevice, 'Do Config'));
  
  let abortXML = movieRender.abortRender();
  result.push(await genericSendCommand(abortXML, subDevice, 'Abort Render'));
  
  let renderProfileXML = movieRender.getRenderProfile(subDevice);
  result.push(await genericSendCommand(renderProfileXML, subDevice, 'Get Render Profile'));
  
  let cancelTriggerXML = movieRender.cancelSystemTrigger(subDevice, currentConfig.triggerFirstId, currentConfig.triggerLastId);
  result.push(await genericSendCommand(cancelTriggerXML, subDevice, 'Cancel All Triggers'));

  let detachMediaXML = movieRender.detachMedia(subDevice);
  result.push(await genericSendCommand(detachMediaXML, subDevice, 'Detach Media'));

  let configMergeXML = movieRender.setConfigMerge(subDevice, renderDetails.profileName);
  result.push(await genericSendCommand(configMergeXML, subDevice, 'Merge Config'));

  let attachBackgroundXML = movieRender.attachBackgroundMedia(backgroundMedia);
  result.push(await genericSendCommand(attachBackgroundXML, subDevice, 'Attach Background'));

  let deferBackgroundPlayXML = movieRender.deferPlay(backgroundMedia.playerId, backgroundMedia.triggerId);
  result.push(await genericSendCommand(deferBackgroundPlayXML, subDevice, 'Defer Background Play'));

  let renderBackgroundLayerXML = movieRender.renderLayerStateChange(backgroundMedia.triggerId, backgroundMedia.layerNumber, backgroundMedia.playerId );
  result.push(await genericSendCommand(renderBackgroundLayerXML, subDevice, 'Render Background Layer State Change'));

  let deferTriggerTimecodeBackgroundXML = movieRender.deferTriggerToTimecode(backgroundMedia.triggerId, backgroundMedia.startTimecode, backgroundMedia.description);
  result.push(await genericSendCommand(deferTriggerTimecodeBackgroundXML, subDevice, 'Defer Trigger Timecode Background'));

  let attachPageXML = movieRender.attachPageMedia(pageDetails.playerId, pageDetails.jobName, pageDetails.page, pageDetails.som, pageDetails.eom, pageDetails.fieldData);
  result.push(await genericSendCommand(attachPageXML, subDevice, 'Attach Page Media'));

  let deferPageXML = movieRender.deferPlay(pageDetails.playerId, pageDetails.triggerId);
  result.push(await genericSendCommand(deferPageXML, subDevice, 'Defer Page Play'));

  let renderPageLayerXML = movieRender.renderLayerStateChange(pageDetails.triggerId, pageDetails.layerNumber, pageDetails.playerId );
  result.push(await genericSendCommand(renderPageLayerXML, subDevice, 'Render Page Layer State Change'));

  let deferTriggerTimecodePageXML = movieRender.deferTriggerToTimecode(pageDetails.triggerId, pageDetails.startTimecode, pageDetails.description);
  result.push(await genericSendCommand(deferTriggerTimecodePageXML, subDevice, 'Defer Page Trigger Timecode'));

  if (myPpwlDetails != undefined){
    let numDetails = myPpwlDetails.length;
    let logoTriggerId = 10;
    let logoPlayerId = '6';
    let logoLayer = '3';
    
    for (let i = 0; i < numDetails - 1; i++){
      let endTimecode = tc.timecodeAdd(myPpwlDetails[i].timecode, myPpwlDetails[i+1].timecode);
      let attachPpwlXML = movieRender.attachPpwlMedia(logoPlayerId +i, myPpwlDetails[i].ppwlFilename, myPpwlDetails[i].SOM, myPpwlDetails[i].EOM);
      result.push(await genericSendCommand(attachPpwlXML, subDevice, 'Attach Logo Media: ' + i));

      let deferPpwlXML = movieRender.deferPlay(logoTriggerId + i, logoPlayerId + i);
      result.push(await genericSendCommand(deferPpwlXML, subDevice, 'Defer Logo Play: ' + i));

      let renderPpwlLayerXML = movieRender.renderLayerStateChange(logoTriggerId + i, logoLayer, logoPlayerId + i );
      result.push(await genericSendCommand(renderPpwlLayerXML, subDevice, 'Render Logo Layer State Change: ' + i));

      let deferTriggerTimecodePpwlXML = movieRender.deferTriggerToTimecode(logoTriggerId + i, myPpwlDetails[i].timecode, "Logo");
      result.push(await genericSendCommand(deferTriggerTimecodePpwlXML, subDevice, 'Defer Logo Trigger Timecode: + i'));
    }
  }

  let renderBlackLayerXML = movieRender.blackRenderLayerStateChange(blackDetails.triggerId, blackDetails.layerNumber);
  result.push(await genericSendCommand(renderBlackLayerXML, subDevice, 'Black Layer State Change'));

  let deferTriggerTimecodeBlackXML = movieRender.deferTriggerToTimecode(blackDetails.triggerId, blackDetails.startTimecode, blackDetails.description);
  result.push(await genericSendCommand(deferTriggerTimecodeBlackXML, subDevice, 'Defer Black Trigger Timecode'));

  let renderFileXML = movieRender.renderToFile(renderDetails);
  result.push(await genericSendCommand(renderFileXML, subDevice, 'Render the file'));

  return result;
}

async function pageDetailsDescription(workDetailsFilenameUNC){
  let myWorkDetails = await readWorkDetails(workDetailsFilenameUNC);
  let myPageDetails = await readPageDetails(myWorkDetails.pageDetailsFilename);
  return myPageDetails.description.split('_').join(' ');
}

async function readFullDetails(filename){
  let server = netSMB2.findMyServer(filename);
  server.ipShare = await netSMB2.getIPShare(server);
  let path = netSMB2.findMyPath(filename)
  let theFullDetails = await netSMB2.readJson(server, path);
  return theFullDetails;
    
}

module.exports = {playBlack, playTest, playOutOverTest, playOut, playoutPageNumber, playoutPageNumberOverTest, getPageNumberAndNameDetails, readJpeg, readDirectory, clearJpegFolder, exportJpegFromWorkfile, 
                  exportMp4FromWorkfile, renderMovie, pageDetailsDescription, playOutFromFullDetails, exportJpegFromFullDetailsFile, exportMp4FromFullDetailsFile, eventAbort, exportJpegFromFullDetails}