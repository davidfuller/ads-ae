const mediaPlayer = require('./player.js');
const comms = require('./streamMasterCommunication.js');
const events = require('events');
const xmlToJson = require('./genericXmlJson.js');
const pixelLog = require('./pixelLog.js');
const netSMB2 = require('./netSMB2.js');
const xmlStrings = require('./xmlStrings');

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


module.exports = {playBlack, playTest, playOutOverTest}