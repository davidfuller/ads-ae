



function parseErrors(theErrors){
  if (theErrors.hasError){
    let myMessage = []
    for (myError of log.errors){
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
    return myMessage.join("\r\n")
  } else {
    return ''
  }
}

module.exports = {parseErrors}