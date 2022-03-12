/**
 * @typedef {object} BackgroundMedia
 * @property {string} filename
 * @property {string} som
 * @property {string} eom
 * @property {string} playerId
 * @property {string} triggerId
 * @property {string} layerNumber
 * @property {string} startTimecode
 * @property {string} description
 */

/**
 * @typedef {object} PixelError
 * @property {string} errorNumber
 * @property {string} errorDescription
 */

/**
 * @typedef {object} StreamMasterLog
 * @property {string} logTime
 * @property {string} eventName
 * @property {boolean} hasError
 * @property {PixelError[]} theErrors
 * 
 */

/** 
 * @typedef {object} CommandResponse
 * @property {string} xml
 * @property {StreamMasterLog[]} log
 */


/**
 * @typedef {object} CurrentConfig
 * @property {string} mediaProfilesFilename
 * @property {string} configFilename
 * @property {number} renderSubDevice
 * @property {number} playoutSubDevice
 * @property {string} triggerFirstId
 * @property {string} triggerLastId
 */
 
/**
 * @typedef {object} BlackDetails
 * @property {string} triggerId
 * @property {string} layerNumber
 * @property {string} startTimecode
 * @property {string} description
 */
 /**
 * @typedef {Object} PageDetails
 * @property {string} jobName
 * @property {string} page
 * @property {string} som
 * @property {string} eom
 * @property {string} playerId
 * @property {string} triggerId
 * @property {string} layerNumber
 * @property {string} startTimecode
 * @property {string} description
 * @property {string} fieldData
 * @property {string} jobPath
 */

/**
 * @typedef {object} RenderDetails
 * @property {string} startTimecode
 * @property {string} endTimecode
 * @property {string} somTimecode
 * @property {string} profileName
 * @property {string} folder
 * @property {string} filePattern
 */
/**
 * @typedef {Object} JpegDetails
 * @property {string} width
 * @property {string} height
 * @property {string} renderSubDevice
 * @property {string} filenameBase
 */
/**
 * @typedef {Object} WorkDetails
 * @property {string} pageDetailsFilename
 * @property {string} jpegDetailsFilename
 * @property {string} renderDetailsFilename
 * @property {string} backgroundMediaFilename
 * @property {string} ppwgFilename
 * @property {string} ppwlDetailsFilename
 * @property {string[]} commands
 */