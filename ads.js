const path = require('path');
const fs = require('fs');
const fspromises = require('fs').promises;
const xmlString = require('./xmlStrings.js');
const net = require('./netSMB2.js');
const tc = require('./timecode.js');
const api = require('./apiHandler.js');
const xmlToJson = require('./genericXmlJson.js');

//let url ='http://10.254.31.52/media_files/recent.xml?not_loaded=true&pos=1'
let url ='http://192.168.1.109:3010/media_files/recent.xml?not_loaded=true&pos=1'

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
 * @param {string} name
 * @returns {object}
 */
async function readMachineProfile(userPath, name){
  let filename = path.join(userPath, 'ads', name + '.json');
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
 * @returns {object}
 */
 async function readServerSettings(userPath, server){
  let filename;
  if (server == "test"){
    filename = path.join(userPath, 'ads', 'server_dunmow.json');
  } else {
    filename = path.join(userPath, 'ads', 'server_chiswick.json');
  }
  
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
  let machineProfile = await readMachineProfile(userPath, 'pomatter');
  console.log(jsonAds.media_files.item[0].fields);
  console.log('Machine Profile')
  console.log(machineProfile);
  let myFields = []
  for (const thefield of jsonAds.media_files.item[0].fields){
    let temp = {}
    temp.fieldNumber = thefield.number[0];
    temp.value = thefield.value[0].replace("|-|","").trim().replace(machineProfile.webAppAssetsFolder, machineProfile.localAssetsFolder);
    myFields.push(temp);
  }
  
  console.log("These are the fields");
  console.log(myFields);
  return myFields;
}

async function createAeJson(userPath, jsonAds, theTemplate, theSettings, renderDetails){
  let theFields = await parsedFieldData(userPath, jsonAds, false);
  let fields = {}
  let media = [];
  for (var i = 0; i < theFields.length; i++){
    let fieldNumber = theFields[i].fieldNumber;
    let fieldName = findAeFieldname(theTemplate, fieldNumber);
    if (fieldName != undefined){
      if (fieldName.hasMedia){
        fields[fieldName.name] = path.basename(theFields[i].value);
        media.push(theFields[i].value);
      } else {
        fields[fieldName.name] = theFields[i].value;
      }
    }
  }

  console.log("JSON ADS")
  console.log(jsonAds)

  let missing = missingAEFields(fields, theTemplate);

  for (var i = 0; i < missing.length; i ++){
    fields[missing[i].name] = "";
  }
  let jsonData = jsonAds.media_files.item[0];
  fields["name"] = jsonData.name[0];

  console.log('Package present');
  console.log('package_filename' in jsonData);

  if ('package_filename' in jsonData){
    fields["packageFilename"] = jsonAds.media_files.item[0].package_filename[0];
  } else {
    fields["packageFilename"] = "";
  }

  console.log('Sports IPP');
  console.log('sports_ipp' in jsonData);

  if ('sports_ipp' in jsonData){
    fields["sportsIpp"] = jsonAds.media_files.item[0].sports_ipp[0];
  } else {
    fields["sportsIpp"] = false;
  }


  let dateString = new Date().toISOString().replace(/T|:|-/g, '_').substring(0, 19)
  fields["renderFilename"] = renderDetails.filePattern.replace('%d', dateString);
  fields["aeMp4Filename"] = renderDetails.aeMp4Filename;
  fields["aeAviFilename"] = renderDetails.aeAviFilename;
  fields["aeProResFilename"] = renderDetails.aeProResFilename;
  fields["textFilename"] = renderDetails.textFilename;
  fields["aeRenderFolder"] = renderDetails.aeRenderFolder;
  fields["aePackageFolder"] = renderDetails.aePackageFolder;
  fields["aeProResFolder"] = renderDetails.aeProResFolder;
  
  let specials = {}
  specials["specials"] = {};
  specials["specials"][theTemplate.template.aeName] = fields;
  console.log(specials);
  let theFilename = theTemplate.template.aeName + ".json";
  console.log(theFilename);
  let result = await saveAeJson(specials, theSettings, theFilename);

  return {specials: specials, media: media, filename: theFilename, saved: result};

}

function findAeFieldname(theTemplate, fieldNumber){
  let aeFields = theTemplate.template.aeFields;
  return aeFields[fieldNumber];
}

function missingAEFields(currentFields, theTemplate){
  let aeFields = theTemplate.template.aeFields;
  let missing = [];
  for (const item in aeFields){
    console.log(item);
    let found = false;
    for (const field in currentFields){
      if (field == aeFields[item].name){
        found = true;
        break;
      }
    }
    if (!found){
      missing.push(aeFields[item]);
    }
  }
  console.log("Missing");
  console.log(missing);
  return missing;
}

async function saveAeJson(specials, theSettings, theFilename){
  let filename = theSettings.aeSpecialsJsonFolderUNC + theFilename;
  let server = net.findMyServer(filename);
  server.ipShare = await net.getIPShare(server);
  let myPath = net.findMyPath(filename)
  let result = await net.writeJson(server, myPath, specials)
  console.log(result)
  return result;
}

async function readAeJson(theSettings, theFilename){
  let filename = theSettings.aeSpecialsJsonFolderUNC + theFilename;
  let server = net.findMyServer(filename);
  server.ipShare = await net.getIPShare(server);
  let myPath = net.findMyPath(filename);
  let specials = await net.readJson(server, myPath);
  console.log("Read aeJson");
  console.log(specials);
  return specials;
}



async function updateAeJobFile(specials, theTemplate, renderDetails){
  let filename = theSettings.aeJobFileUNC;
  let server = net.findMyServer(filename);
  server.ipShare = await net.getIPShare(server);
  let myPath = net.findMyPath(filename)
  jobDetails = await net.readJson(server, myPath);
  console.log("jobDetails");
  console.log(jobDetails.actions.postrender[0].output);
  console.log(specials["specials"][theTemplate.template.aeName]["renderFilename"]);
  console.log(renderDetails)
  jobDetails.actions.postrender[0].output = renderDetails.aeRenderFolder + specials["specials"][theTemplate.template.aeName]["renderFilename"];
  jobDetails.template.composition = theTemplate.template.aeName;
  console.log(jobDetails);
  let result = await net.writeJson(server, myPath, jobDetails);
  return result;
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

function specialName(jsonAds){
  return jsonAds.media_files.item[0].name[0];
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
  renderDetails.aeRenderFolder = renderSettings.aeRenderFolder;
  renderDetails.aePackageFolder = renderSettings.aePackageFolder;
  renderDetails.aeProResFolder = renderSettings.aeProResFolder;
  renderDetails.aeMp4Filename = sanitisedName(jsonAds) + ".mp4"
  renderDetails.aeAviFilename = sanitisedName(jsonAds) + ".avi"
  renderDetails.aeProResFilename = sanitisedName(jsonAds) + ".mov"
  renderDetails.textFilename = sanitisedName(jsonAds) + ".txt"
 
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

async function copyMissingFiles(userPath, missingFiles, isTestServer){
  let pageSettings = await readPageSettings(userPath);
  let result = true;
  let messages = [];
  let sourceFile;
  for (let destinationFile of missingFiles){
    if (isTestServer){
      sourceFile = destinationFile.replace(pageSettings.createAssetsFolder, pageSettings.testSourceAssetsFolder);
    } else {
      sourceFile = destinationFile.replace(pageSettings.createAssetsFolder, pageSettings.sourceAssetsFolder);
    }
    
    console.log(sourceFile);
    if (fs.existsSync(sourceFile)){
      console.log ("Found");
      try{
        await fspromises.copyFile(sourceFile, destinationFile);
        messages.push("File copied: " + destinationFile)
      } catch (e){
        console.log ("Not copied");
        messages.push("Error in copy for file: " + destinationFile)
        result = false;
      }
    } else {
      console.log("No source file");
      messages.push("Cannot find sourcefile: " + sourceFile)
      result = false;
    }
  }
  return {result: result, messages: messages};
}

async function copyMp4ToServer(fullFilename, jsonAds, serverSettings){
  let result = false
  let destinationFile = path.join(serverSettings.specialWatchFolder, jsonAds.media_files.item[0].filename[0]);
  let message;
  console.log (destinationFile);
  if (fs.existsSync(fullFilename)){
    try{
      await fspromises.copyFile(fullFilename, destinationFile);
      console.log("Copied")
      message = "Mp4 copied: " + jsonAds.media_files.item[0].filename[0];
      result = true;
    } catch (e){
      console.log ("Not copied");
      message = "Error copying: " + jsonAds.media_files.item[0].filename[0];
      result = false;
    }
  } else {
    console.log("No source file");
    message = "Cannot find source file: " + fullFilename;
    result = false;
  }
  return {result: result, message: message}
}

async function sendFileQueuedToWebApp(originalFilename, jsonAds, serverSettings){
  let theUrl = serverSettings.queue_url.replace("|id|", jsonAds.media_files.item[0].id[0]).replace("|filename|", encodeURIComponent(originalFilename));
  let myData;
  let result;
  let message;
  try {
    myData = await api.httpGet(theUrl);
    console.log (xmlToJson.parseXML(myData));
    message = "File queued in web app";
    result = true
  } catch (e) {
    message = "Failed to queue file in web app";
    result = false;
  }
  
  return {result: result, message: message};
  
}

module.exports = {readBackground, readTemplates, findTemplate, parsedFieldData, createPPWG, createPageDetails, createJpegDetails, createRenderDetails, createPpwgFilename, readPageSettings, mediaFields, 
  missingMediaFiles, copyMissingFiles, readServerSettings, sanitisedName, copyMp4ToServer, sendFileQueuedToWebApp, createAeJson, updateAeJobFile, readAeJson, specialName}