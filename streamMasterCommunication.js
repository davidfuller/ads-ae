var net = require('net');

const ip = '192.168.1.116'
const commandPort = [0, 10220, 17020];
/**
 * 
 * @param {string} theCommand 
 * @param {boolean} saveData 
 * @param {boolean} extractImages 
 * 
 */
 async function sendCommand(theCommand, theEvent, subDevice){

  var client = new net.Socket();
  var num = 0;
  var delimiter = '</PixelXML>'
  var theData = "";
  try{
    console.log('Before connect');
    client.connect(commandPort[subDevice], ip, function() {
      console.log("I got here")
      client.write(theCommand);
    });
  }
  catch(err){
    console.log(err)
  }


  client.on('data', function(data) {
    //console.log('Received: ' + data);
    theData += data;
    num += 1;
    if (theData.indexOf(delimiter) > -1){
      client.destroy(); // kill client after server's response
    }
  });

  client.on('close', function() {
    theEvent.emit('closed', theData)
  });

  client.on('error', function(myError){
    theEvent.emit('error', myError);
  });
}


module.exports = {sendCommand}