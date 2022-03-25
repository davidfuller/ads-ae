const path = require('path');
const root = {
    open:'<PixelXML xmlns="http://pixelpower.com/PixelXML">', 
    close: '</PixelXML>'
};

const setLayerState = {
    open:   '<SetLayerStates Category="Playout" Device="MasterControl">',
    close:  '</SetLayerStates>'
}

const layerStateChange = {
    open:   '<LayerStateChange>',
    close:  '</LayerStateChange>'
}
/**
 * 
 * @param {string} ppwlFilename 
 * @returns {string}
 */
 const ppwlAsset = function(ppwlFilename){
  let temp = '<Asset><Media Name="' + ppwlFilename + '">';
  temp += '</Media></Asset>';
  return temp;
}
/**
 * 
 * @param {string} triggerId 
 * @param {boolean} playNow
 * @param {string} timecode
 * @returns {string}
*/
function doTrigger(triggerId, playNow, timecode){
    if (timecode != null && timecode !=''){
        return deferTriggerTimecode(timecode);
    } else if (triggerId != '' && !playNow){
        return deferTrigger(triggerId);
    } else {
        return '';
    }
}
/**
 * 
 * @param {string} bus 
 * @param {string} level 
 * @param {string} number 
 * @returns {string}
*/
function layer(bus, level, number){
    return '<Layer Bus="' + bus +'" Level="' + level + '" Number="' + number +'"/>';
}

const state = function(active){
var temp = {}
    temp.open = '<State Active="' + active +'">';
    temp.close = '</State>';
return temp;
}


/**
 * 
 * @param {string} type 
 * @param {string} playerId 
 * @param {string} index 
 * @returns {string}
*/
function source(type, playerId, index){
    if (playerId != ''){
        return '<Source Type="' + type + '" Matrix="' + playerId + '" Index="' + index + '" />';
    } else {
        return '<Source Type="' + type + '" Index="' + index + '" />';
    }
}

/**
 * 
 * @param {string} triggerID 
 * @returns {string}
*/

function systemTrigger(triggerID){
    return '<SystemTrigger Category="Timeline" Device="System"><Trigger TriggerID="' + triggerID + '"/></SystemTrigger>';
}

/**
 * @param {string} jobPath
 * @param {string} xmlString 
 * @returns {string}
 */
 function ppwgToAsset(jobPath, xmlString){
  const startBit = '<Video FileName="'
  const endBit = '</Video>';
  const mediaStart = '<Asset><Media Name="' + jobPath;
  const mediaEnd = '</Media></Asset>';

  var start = xmlString.indexOf(startBit);
  var end = xmlString.indexOf(endBit) + endBit.length;

  if (start > -1 && end > -1){
    return xmlString.substring(start, end).replace(startBit, mediaStart).replace(endBit, mediaEnd);
  } else {
    return null;
  }
}

/**
 * 
 * @param {string} jobPath
 * @param {string} xmlString 
 * @param {string} trigger 
 * @param {boolean} playNow
 * @param {string} timecode
*/
function createPageXML(xmlString, triggerId, playNow, timecode){

  /**
   * @type {string}
   */
  var tempXML;

  tempXML = root.open + setLayerState.open
  tempXML += doTrigger(triggerId, playNow, timecode);
  tempXML += layerStateChange.open;
  tempXML += layer('Program', "V", '1');
  tempXML += state('true').open
  tempXML += xmlString
  tempXML += state().close; 
  tempXML += layerStateChange.close;
  tempXML += setLayerState.close;
  tempXML += root.close;

  return tempXML;
}

/**
 * 
 * @param {string} ppwlFilename 
 * @param {string} trigger 
 * @param {boolean} playNow
 * @param {string} timecode
 * @returns {string}
*/
function createPpwlXML(ppwlFilename, triggerId, playNow, timecode){
  /**
   * @type {string}
   */
  var tempXML;
  tempXML = root.open + setLayerState.open
  tempXML += doTrigger(triggerId, playNow, timecode);
  tempXML += layerStateChange.open;
  tempXML += layer('Program', "V", '2');
  tempXML += state('true').open
  tempXML += ppwlAsset(ppwlFilename);
  tempXML += state().close; 
  tempXML += layerStateChange.close;
  tempXML += setLayerState.close; 
  tempXML += root.close;

  return tempXML;
}

/**
 * 
 * @param {string} clientId 
 * @param {string} playerId 
*/
function attachMedia(clientId, playerId){
  var temp = {}
  temp.open = '<AttachMedia ClientID="' + clientId + '" Device="Clip" Category="Timeline" Level="VA" PlayerID="' + playerId +'">';
  temp.close = '</AttachMedia>'
  return temp
}
/**
 * 
 * @param {string} fileName 
 * @param {string} loop 
 * @param {string} som
 * @param {string} eom
 * @returns {string}
*/
function media(fileName, loop, som, eom){

  var temp = '<Media Name="' + fileName + '" Loop="' + loop + '"';
  if (som != null && eom != null){
    temp += ' SOM="' + som + '" EOM="' + eom + '"';
  }
  temp += ' />'

  return temp
}
/**
 * 
 * @param {string} triggerId 
 * @returns {string}
*/
function deferTrigger(triggerId){
  return '<Deferral><DeferToSystemTrigger TriggerID="' + triggerId + '"/></Deferral>';
}

function deferTriggerTimecode(timecode){
  return '<Deferral><DeferToTimecode Timecode="' + timecode + '"/></Deferral>';
}
/**
 * 
 * @param {string} clientId 
 * @param {string} level 
 * @param {string} speed 
 * @param {string} playerId 
 * @returns {{open: string, close: string}}
*/
function playMedia(clientId, level, speed, playerId){

  var temp = {};
  temp.open = '<PlayMedia ClientID="' + clientId + '" Device="Clip" Category="Timeline" Level="' + level + '" Speed="' + speed + '" PlayerID="' + playerId + '">';
  temp.close = '</PlayMedia>';
  
  return temp
}
/**
 * 
 * @param {string} ppwgFilename 
 * @param {object} pageDetails 
 * @param {string} jobFolder
 * @returns {object}
*/
function pageDetailsFromPPWG(ppwgXML, pageDetails){

  var tempDetails = extractJobAndPage(ppwgXML);
  //let tempPageDetails = {...pageDetails};

  if (tempDetails === null){
  } else {
    pageDetails.jobName = path.join(pageDetails.jobPath, tempDetails.jobName);
    pageDetails.page = tempDetails.page;
    var fieldData = extractFieldData(ppwgXML)
    if (fieldData === null){
    } else {
      pageDetails.fieldData = fieldData;
    }
  }
  return pageDetails
}
/**
 * 
 * @param {string} xmlString 
 * @returns {object}
 */
function extractJobAndPage(xmlString){

  const startBit = '<Video FileName="'
  const endBit = '">';

  var start = xmlString.indexOf(startBit) + startBit.length;
  var end = xmlString.indexOf(endBit, start);

  if (start > -1 && end > -1){
    var combined = xmlString.substring(start, end);
    var split = combined.split('\\');
    if (split.length == 2){
      var result = {}
      result.jobName = split[0]
      result.page = split[1]
      return result
    } else {
      return null
    }
  } else {
    return null;
  }
}
/**
 * 
 * @param {string} xmlString 
 * @returns {string}
*/
function extractFieldData(xmlString){
  const startBit = '<OverrideData>';
  const endBit = '</OverrideData>';

  var start = xmlString.indexOf(startBit);
  var end = xmlString.indexOf(endBit, start) + endBit.length;

  if (start > -1 && end > -1){
    return xmlString.substring(start, end);
  } else {
    return null;
  }
}

function imageXMLPPWG(pageDetails, width, height){
  /**
   * @type {string}
   */
  var tempXML;

  tempXML = root.open;
  tempXML += mediaInfo.open;
  tempXML += request.open;
  tempXML += mediaNameWithOverrideData(pageDetails);
  tempXML += preview(width, height);
  tempXML += request.close;
  tempXML += mediaInfo.close;
  tempXML += root.close;

  return tempXML;

  //var getImageDirect ='<PixelXML xmlns="http://pixelpower.com/PixelXML"><GetMediaInfo Device="Clip" Category="Manage"><DefaultTimecodeRate FrameRate="TestHarness.Default" DropFrame="false" />
  //<Request><Media Name="\\\\pomatter\\Assets\\Create\\TV3S_CREATE_MASTER.cgz\\1210"></Media><Preview AutoCrop="false" Category="PreviewFrames"><Size Width="512" Height="288" /></Preview></Request></GetMediaInfo></PixelXML>'
}
const mediaInfo = {
  open:   '<GetMediaInfo Device="Clip" Category="Manage"><DefaultTimecodeRate FrameRate="TestHarness.Default" DropFrame="false" />',
  close:  '</GetMediaInfo>'
}

const request = {
  open:   '<Request>',
  close:  '</Request>'
}

function mediaNameWithOverrideData(pageDetails){
  var tempXML;

  tempXML = '<Media Name="' + pageDetails.jobName +'\\' + pageDetails.page + '">';
  tempXML += pageDetails.fieldData;
  tempXML += '</Media>';
  return tempXML
}

/**
 * 
 * @param {number} width 
 * @param {number} height 
 * @returns {string}
 */
 function preview(width, height){

  return '<Preview AutoCrop="false" Category="PreviewFrames"><Size Width="' + width + '" Height="' + height + '" /></Preview>'
}

const imageDataTag = {
  open: '<ImageData>',
  close:  '</ImageData>'
}

module.exports = {root, setLayerState, doTrigger, layerStateChange, layer, state, source, systemTrigger, ppwgToAsset, createPageXML, createPpwlXML, attachMedia, media, playMedia, pageDetailsFromPPWG, imageXMLPPWG, imageDataTag}