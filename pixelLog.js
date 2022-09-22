/**
 * 
 * @param {Object} xml 
 * @param {string} name 
 * @returns {StreamMasterLog}
 */
 function pixelLog(xmlObject, name){
    /**
     * @type {StreamMasterLog}
     */
    let result = {};
  
    /**
     * @type {PixelError}
     */
    let myError = {};
  
    result.eventName = name;
    result.logTime = new Date();
    result.theErrors = [];
  
    if (xmlObject.PixelXML.Completed !== undefined){
      let commandErrors = xmlObject.PixelXML.Completed[0].CommandError;
    
      if (commandErrors !== undefined){
        result.hasError = true;
        for (const commandError of commandErrors){
          myError.errorNumber = commandError.Number[0];
          myError.errorDescription = commandError.Description[0];
          result.theErrors.push({...myError});
        }
      } else {
        result.hasError = false;
      }
    } else {
      result.hasError = false;
    }
  
    return result;
  }

/**
 * 
 * @param {string} name 
 * @returns {StreamMasterLog}
 */
  function connectionErrorLog(name, subDevice){
    /**
     * @type {StreamMasterLog}
     */
     let result = {};
  
     /**
      * @type {PixelError}
      */
     let myError = {};
   
     result.eventName = name;
     result.logTime = new Date();
     result.theErrors = [];

     result.hasError = true;
     myError.errorNumber = 11021960;
     myError.errorDescription = "Connection issue with sub-device: " + subDevice + ". Is StreamMaster running?";
     result.theErrors.push({...myError});

     return result;
  }



  
  module.exports = {pixelLog, connectionErrorLog};