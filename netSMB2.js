const SMB2 = require('@marsaud/smb2');
const dns = require('dns')

const myServers = [
  {
    server: 'alpaca',
    share: 'dropbox',
    dnsName: 'alpaca.local',
    username: 'david',
    password: 'diane1',
    ipShare: ''
  }
]

function findMyServer(uncPath){

  if (uncPath.startsWith('\\\\')){
    /**
     * @type {string[]}
     */
    let parts = uncPath.split('\\')
    if (parts.length >= 4){
      let server = parts[2]; 
      let share = parts[3];
      for (var i = 0; i < myServers.length; i++){
        if (myServers[i].server == server && myServers[i].share == share){
          return myServers[i];
        }
      }
    }
  }
  return null;
}

async function getIPShare(serverDetails){
  var dnsPromises = dns.promises;
  var dnsOptions = {
    family: 4,
    all: false
  }

  var ip = await dnsPromises.lookup(serverDetails.dnsName, dnsOptions)
  return '\\\\' + ip.address + '\\' + serverDetails.share
}

/**
 * 
 * @param {string} uncPath 
 * @returns {string}
*/

function findMyPath(uncPath){
  /**
   * @type {string}
   */
  let path;

  if (uncPath.startsWith('\\\\')){
    /**
     * @type {string[]}
    */
    let parts = uncPath.split('\\')
    if (parts.length> 5){
      path = parts.slice(4).join('\\');
    } else {
      path = '';
    }
  } else {
    path = '';
  }
  return path
}
/**
 * 
 * @param {object} serverDetails
 * @param {string} path
 */
 async function readJson(serverDetails, path){
  let data = await readData(serverDetails, path);
  return JSON.parse(data);
}

/**
 * 
 * @param {string} uncPath 
 */
 async function readXML(serverDetails, path){
  let data = await readData(serverDetails, path)
  return data.toString();
}

/**
 * 
 * @param {object} serverDetails
 * @param {string} path
*/
async function readData(serverDetails, path){

  let client = await getServer(serverDetails)
  if (client != null){
    try {
      let exists = await client.exists(path);
      if (exists){
          let rawData = await client.readFile(path);
          return rawData;
      } else {
        return null;
      }
    }
    catch(err){
      console.log(err)
      return null;
    }
  } else {
    return null;
  }
  
}

async function getServer(serverDetails){
    
  if (serverDetails != null){
    try {
      let client = new SMB2({share: serverDetails.ipShare, domain: '', username: serverDetails.username, password: serverDetails.password});
      return client;
    }
    catch(err){
      console.log(err);
      return null;
    }
  }
  return null;
}

/**
 * 
 * @param {object} serverDetails 
 * @param {string} path 
 * @returns {string[]}
 */
 async function readDir(serverDetails, path){
  
  let filenames = [];
  let client = await getServer(serverDetails)
  if (client != null){
    try {
      let exists = await client.exists(path);
      if (exists){
          let files = await client.readdir(path, {stats: true});
          for (let file of files){
            if (!file.isDirectory()){
              filenames.push(file.name)
            }
          }
          return filenames;
      } else {
        return null;
      }
    }
    catch(err){
      console.log(err)
      return null;
    }
  } else {
    return null;
  }
}

/**
 * 
 * @param {object} serverDetails 
 * @param {string} path 
 * @returns {string}
*/
async function readJpeg(serverDetails, path){
  let client = await getServer(serverDetails)
  if (client != null){
    try {
      let exists = await client.exists(path);
      if (exists){
        let result = await client.readFile(path);
        return result.toString('base64');
      } else {
        return ''
      }
      
    }
    catch(err){
      console.log(err)
      return null;
    }
  } else {
    return null;
  }
}


module.exports = {findMyServer, getIPShare, findMyPath, readJson, readXML, readDir, readJpeg}