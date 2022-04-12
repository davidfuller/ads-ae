const fs = require('fs');
const xmlStrings = require('./xmlStrings');


function setMediaProfile(mediaProfilesFilename){

  let xmlString;

  xmlString = readXML(mediaProfilesFilename);
  return xmlString;
}

/**
 * 
 * @param {string} fileName 
 * @returns {string}
 */
 function readXML(fileName){
  try {
      var data = fs.readFileSync(fileName, 'utf8');
      return data;    
  } catch(e) {
      console.log('Error:', e.stack);
  }
}

function abortRender(){
  var tempXML;

  tempXML = xmlStrings.root.open
  tempXML += xmlStrings.abortRender()
  tempXML += xmlStrings.root.close

  return tempXML;

}
function getRenderProfile(subDevice){
  let tempXML;

  tempXML = xmlStrings.root.open
  tempXML += xmlStrings.getRenderProfile(subDevice)
  tempXML += xmlStrings.root.close

  return tempXML;
}

function cancelSystemTrigger(subDevice, triggerIdFirst, triggerIdLast){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.cancelSystemTrigger(subDevice).open;
  tempXML += xmlStrings.triggerIdRange(triggerIdFirst, triggerIdLast);
  tempXML += xmlStrings.cancelSystemTrigger().close;
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function detachMedia(subDevice){
  let tempXML;

  tempXML = xmlStrings.root.open
  tempXML += xmlStrings.detachMedia(subDevice)
  tempXML += xmlStrings.root.close

  return tempXML;
}

function setConfigMerge(subDevice, mediaProfile){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.setConfigMerge(subDevice).open;
  tempXML += xmlStrings.mediaPipelineConfig.open;
  tempXML += xmlStrings.mediaPipelineInput;
  tempXML += xmlStrings.mediaPipelineOutput(mediaProfile);
  tempXML += xmlStrings.mediaPipelineConfig.close;
  tempXML += xmlStrings.setConfigMerge().close;
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function attachBackgroundMedia(backgroundMedia){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.attachRenderBackgroundMedia(backgroundMedia.filename, backgroundMedia.som, backgroundMedia.eom);
  tempXML += xmlStrings.root.close;

  return tempXML;
}
function deferPlay(playerId, triggerId){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.deferPlay(playerId, triggerId);
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function renderLayerStateChange(triggerId, layerNumber, playerId){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.renderLayerStateChange(triggerId, layerNumber, playerId);
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function blackRenderLayerStateChange(triggerId, layerNumber){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.blackRenderLayerStateChange(triggerId, layerNumber);
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function deferTriggerToTimecode(triggerId, timecode, description){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.deferTriggerToTimecode(triggerId, timecode, description);
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function attachPageMedia(playerId, jobFilename, pageNo, som, eom, fieldData){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.attachPageMedia(playerId, jobFilename, pageNo, som, eom, fieldData);
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function attachPpwlMedia(playerId, ppwlFilename, som, eom){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.attachPpwlMedia(playerId, ppwlFilename, som, eom);
  tempXML += xmlStrings.root.close;

  return tempXML;
}

function renderToFile(renderDetails){
  let tempXML;

  tempXML = xmlStrings.root.open;
  tempXML += xmlStrings.renderToFile(renderDetails);
  tempXML += xmlStrings.root.close;

  return tempXML;
}

module.exports = {setMediaProfile, abortRender, getRenderProfile, cancelSystemTrigger, detachMedia, setConfigMerge, attachBackgroundMedia, deferPlay, renderLayerStateChange, blackRenderLayerStateChange, deferTriggerToTimecode, 
                    attachPageMedia, attachPpwlMedia, renderToFile}