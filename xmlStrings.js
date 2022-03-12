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

module.exports = {root, setLayerState, doTrigger, layerStateChange, layer, state, source, systemTrigger, ppwgToAsset, createPageXML}