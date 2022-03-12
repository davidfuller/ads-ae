const xml2js = require('xml2js');


function parseXML(xml){
    var myResult
    xml2js.parseString(xml, {mergeAttrs: true}, (err, result) => {
      if(err) {
        throw err;
      }
    
      const json = JSON.stringify(result, null, 2);
      myResult = result;
    })
    return myResult
  }
  
  module.exports = {parseXML}