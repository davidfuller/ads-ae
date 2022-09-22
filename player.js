const xmlStrings = require('./xmlStrings.js');
const clientId = 'MuVi2';

/**
 * 
 * @param {string} triggerId 
 * @param {string} playerId 
 * @param {string} level
 * @param {string} number
 * @param {string} source
 * @param {string} index
 * @param {boolean} playNow
 * @param {string} timecode
 * @returns {string}
 */
 function setLayerStates(triggerId, playerId, level, number, source, index, playNow, timecode){
    var tempXML;
    
    tempXML = xmlStrings.root.open;
    tempXML += xmlStrings.setLayerState.open;
    tempXML += xmlStrings.doTrigger(triggerId, playNow, timecode);
    tempXML += xmlStrings.layerStateChange.open;
    tempXML += xmlStrings.layer('Program', level, number);
    tempXML += xmlStrings.state('true').open;
    tempXML += xmlStrings.source(source, playerId, index);
    tempXML += xmlStrings.state('true').close;
    tempXML += xmlStrings.layerStateChange.close;
    tempXML += xmlStrings.setLayerState.close;
    tempXML += xmlStrings.root.close;
  
    return tempXML;
  }

/**
 * 
 * @param {string} triggerId 
 * @returns {string}
*/
function triggerPlay(triggerId){
var tempXML;

    tempXML = xmlStrings.root.open;
    tempXML += xmlStrings.systemTrigger(triggerId);
    tempXML += xmlStrings.root.close;

    return tempXML;
}
/**
 * 
 * @param {string} triggerId 
 * @returns {string}
*/
function abortEvent(triggerId){
  var tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.eventAbort(triggerId);
  tempXML += xmlStrings.root.close;

  return tempXML;

}


/**
 * 
 * @param {BackgroundMedia} myMedia 
 * @param {string} loop 
 * @returns {string}
*/
function attachMedia(myMedia, loop){
  var tempXML;
 
  tempXML = xmlStrings.root.open;
  var attach = xmlStrings.attachMedia(clientId, myMedia.playerId);
  tempXML += attach.open;
  tempXML += xmlStrings.media(myMedia.filename, loop, myMedia.som, myMedia.eom);
  tempXML += attach.close;
  tempXML += xmlStrings.root.close;
 
  return tempXML;
 }
 
/**
 * 
 * @param {string} triggerId 
 * @param {string} playerId 
 * @param {boolean} playNow
 * @param {string} timecode
 * @returns {string}
*/
function mediaPlay(triggerId, playerId, playNow, timecode){
  var tempXML;
  
  tempXML = xmlStrings.root.open;
  var tempPlayMedia = xmlStrings.playMedia(clientId, 'VA', '100', playerId);
  tempXML += tempPlayMedia.open;
  tempXML += xmlStrings.doTrigger(triggerId, playNow, timecode);
  tempXML += tempPlayMedia.close;
  tempXML += xmlStrings.root.close;

  return tempXML
}


  module.exports = {setLayerStates, triggerPlay, attachMedia, mediaPlay, abortEvent}