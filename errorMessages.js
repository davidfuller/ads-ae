



function parseErrors(theErrors){
  let myMessage = []
  if (theErrors.hasError){
    for (myError of theErrors.errors){
      if (myError.errorNumber == '10110'){
        myMessage.push('Missing page: ' + theErrors.pageNumber);
      } else if (myError.errorNumber == '10131'){
        myMessage.push(myError.errorDescription);
      } else if (myError.errorNumber == '10130'){
        //do nothing
      } else {
        myMessage.push(myError.errorDescription);
      }
    }
  } else {
    myMessage.push('');
  }
  return myMessage;
}

function parseErrorMultiline(theErrors){
  let myMessage = parseErrors(theErrors)
  return myMessage.join("\r\n")
}




module.exports = {parseErrors, parseErrorMultiline}