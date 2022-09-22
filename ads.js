const path = require('path');
const fs = require('fs');
const fspromises = require('fs').promises;
const xmlString = require('./xmlStrings.js');
const net = require('./netSMB2.js');
const tc = require('./timecode.js')
let url ='http://10.254.31.52/media_files/recent.xml?not_loaded=true&pos=1'

/**
 * 
 * @param {string} userPath 
 * @returns {BackgroundMedia}
 */
async function readBackground(userPath){
  let filename = path.join(userPath, 'ads', 'background.json');
  let data = await fspromises.readFile(filename);
  return JSON.parse(data);
}

/**
 * 
 * @param {string} userPath 
 * @returns {object[]}
 */
async function readTemplates(userPath){
  let filename = path.join(userPath, 'ads', 'templates.json');
  let data = await fspromises.readFile(filename);
  return JSON.parse(data);
}

/**
 * 
 * @param {string} userPath 
 * @returns {object}
 */
 async function readPageSettings(userPath){
  let filename = path.join(userPath, 'ads', 'page.json');
  let data = await fspromises.readFile(filename);
  return JSON.parse(data);
}
/**
 * 
 * @param {string} userPath 
 * @returns {object}
 */
 async function readJpegSettings(userPath){
  let filename = path.join(userPath, 'ads', 'jpeg.json');
  let data = await fspromises.readFile(filename);
  return JSON.parse(data);
}

/**
 * 
 * @param {string} userPath 
 * @returns {object}
 */
 async function readRenderSettings(userPath){
  let filename = path.join(userPath, 'ads', 'render.json');
  let data = await fspromises.readFile(filename);
  return JSON.parse(data);
}
/**
 * 
 * @param {string} userPath 
 * @param {object} jsonAds 
 * @returns {object}
 */

async function findTemplate(userPath, jsonAds){
  let templates = await readTemplates(userPath);
  let pageNumber = jsonAds.media_files.item[0].page[0];
  let myTemplate = templates.find(template => template.template.pageNumber == pageNumber);
  return myTemplate;
}

async function parsedFieldData(userPath, jsonAds, isPrep){
  let pageSettings = await readPageSettings(userPath);
  console.log(jsonAds.media_files.item[0].fields);
  console.log(pageSettings);
  let myFields = []
  for (const thefield of jsonAds.media_files.item[0].fields){
    let temp = {}
    temp.fieldNumber = thefield.number[0];
    temp.value = thefield.value[0].replace("|-|","").trim().replace(pageSettings.clarityAssetsFolder,pageSettings.createAssetsFolder);
    myFields.push(temp);
  }
  if (isPrep){
    let jpegSettings = await readJpegSettings(userPath);
    let temp = {}
    temp.fieldNumber = jpegSettings.prepBgField;
    temp.value = jpegSettings.prepBgImage;
    myFields.push(temp);
  }

  console.log("These are the fields");
  console.log(myFields);
  return myFields;
}
async function createPPWG(userPath, jsonAds, pageSettings, pageNumber){

  for (let doPrep = 0; doPrep <= 1; doPrep++){
    let fieldData = await parsedFieldData(userPath, jsonAds, doPrep);
    let xml = xmlString.createPPWG(pageSettings, pageNumber, fieldData);
    let ppwgFilename = createPpwgFilename(pageSettings, pageNumber, doPrep);
    console.log(ppwgFilename);
    savePPWG(ppwgFilename, xml);
  }
  
  return createPpwgFilename(pageSettings, pageNumber, false);
}

function createPpwgFilename(pageSettings, pageNumber, isPrep){
  if (isPrep){
    return path.join(pageSettings.ppwgFolder, path.parse(pageSettings.jobName).name + "_" + pageNumber + '_Prep.ppwg');
  } else {
    return path.join(pageSettings.ppwgFolder, path.parse(pageSettings.jobName).name + "_" + pageNumber + '.ppwg');
  }
}

async function savePPWG(filename, xml){
  let server = net.findMyServer(filename);
  server.ipShare = await net.getIPShare(server);
  let myPath = net.findMyPath(filename)
  let result = await net.writeXML(server, myPath, xml)
}

async function createPageDetails(userPath, jsonAds, theTemplate, pageSettings, pageNumber){
  let pageDetails = {}
  
  pageDetails.jobName = path.join(pageSettings.jobPath, pageSettings.jobName);
  pageDetails.page = pageNumber;
  pageDetails.som = pageSettings.somPageTC
  pageDetails.eom = tc.timecodeAdd(tc.timecodeAdd(theTemplate.template.startOffsetTC, theTemplate.template.eomTC),theTemplate.template.endBufferTC);
  pageDetails.playerId = pageSettings.pagePlayerId;
  pageDetails.triggerId = pageSettings.pageTriggerId;
  pageDetails.layerNumber = pageSettings.pageLayerNumber;
  pageDetails.startTimecode = theTemplate.template.startOffsetTC;
  pageDetails.description = sanitisedName(jsonAds)
  let fieldData = await parsedFieldData(userPath, jsonAds, false);
  let xml = xmlString.overrideFieldData(fieldData).trim();
  pageDetails.fieldData = xml.replace(/[\r\n]/gm, '');
  pageDetails.jobPath = pageSettings.jobPath;

  return pageDetails;
}

function sanitisedName(jsonAds){
  return jsonAds.media_files.item[0].name[0].replace(/[^a-z0-9]/gi, '_').replace(/_{2,}/g, '_');
}

async function createJpegDetails(userPath, jsonAds, pageSettings, pageNumber){
  let jpegDetails = {}
  let jpegSettings = await readJpegSettings(userPath);
  jpegDetails.width = jpegSettings.width;
  jpegDetails.height = jpegSettings.height;
  jpegDetails.renderSubDevice = jpegSettings.renderSubDevice;
  jpegDetails.filenameBase = path.join(jpegSettings.folder, sanitisedName(jsonAds));
  jpegDetails.ppwgFilename = createPpwgFilename(pageSettings, pageNumber, true);

  return jpegDetails;
}

async function createRenderDetails(userPath, jsonAds, theTemplate){
  let renderDetails = {};
  let renderSettings = await readRenderSettings(userPath);
  renderDetails.startTimecode = renderSettings.startTimecode;
  renderDetails.endTimecode = tc.timecodeAdd(tc.timecodeAdd(theTemplate.template.startOffsetTC, theTemplate.template.eomTC),theTemplate.template.endBufferTC);
  renderDetails.somTimecode = renderSettings.somTimecode;
  renderDetails.profileName = renderSettings.profileName;
  renderDetails.folder = renderSettings.folder;
  renderDetails.filePattern = sanitisedName(jsonAds) + renderSettings.filenameSuffix

  return renderDetails;
}

async function mediaFields(userPath, jsonAds, isPrep){
  let pageSettings = await readPageSettings(userPath);
  let myFields = await parsedFieldData(userPath, jsonAds, isPrep);
  console.log(myFields);
  let mediaFilenames = [];
  for (let myField of myFields){
    if (myField.value.toUpperCase().startsWith(pageSettings.createAssetsFolder.toUpperCase())){
      mediaFilenames.push(myField.value);
    }
  }
  console.log("Thesee are the media fields");
  console.log (mediaFilenames);
  return mediaFilenames;
}

function missingMediaFiles(mediaFilenames){
  let missingFiles = [];
  for (let filename of mediaFilenames){
    if (!fs.existsSync(filename)){
      missingFiles.push(filename);
    }
  }
  console.log("Missing files");
  console.log(missingFiles);
  return missingFiles;
}

async function copyMissingFiles(userPath, missingFiles){
  let pageSettings = await readPageSettings(userPath);
  let result = true;
  for (let destinationFile of missingFiles){
    let sourceFile = destinationFile.replace(pageSettings.createAssetsFolder, pageSettings.sourceAssetsFolder);
    console.log(sourceFile);
    if (fs.existsSync(sourceFile)){
      console.log ("Found");
      try{
        await fspromises.copyFile(sourceFile, destinationFile);
        console.log("Copied")
        result = true;
      } catch (e){
        console.log ("Not copied");
        result = false;
      }
    } else {
      console.log("No source file");
      result = false;
    }
  }
  return result;
}



module.exports = {readBackground, url, readTemplates, findTemplate, parsedFieldData, createPPWG, createPageDetails, createJpegDetails, createRenderDetails, createPpwgFilename, readPageSettings, mediaFields, missingMediaFiles, copyMissingFiles}