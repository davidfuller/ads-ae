const xmlStrings = require('./xmlStrings.js');


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
  
    return tempXML
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


  module.exports = {setLayerStates, triggerPlay}