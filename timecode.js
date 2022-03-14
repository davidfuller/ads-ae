const fps = 25;
const zeroPad = (num, places) => String(num).padStart(places, '0');

function timecodeAdd(timecode1, timecode2){
  return framesToTimecodeString(timecodeStringToFrames(timecode1) + timecodeStringToFrames(timecode2))
}

function timecodeAddSeconds(timecode, seconds){
  return framesToTimecodeString(timecodeStringToFrames(timecode) + (seconds * fps));
}

function timecodeGreaterThan(timecode1, timecode2){
  let frames1 = timecodeStringToFrames(timecode1);
  let frames2 = timecodeStringToFrames(timecode2);

  return frames1 > frames2
}

function timecodeStringToFrames(tc){
  let numberArray;
  let frames;

  if (tc.length == 11){
    numberArray = tc.split(':');
    if (numberArray.length == 4){
      frames = parseInt(numberArray[3]);
      frames += parseInt(numberArray[2]) * fps;
      frames += parseInt(numberArray[1]) * fps * 60;
      frames += parseInt(numberArray[0]) * fps * 60 * 60;
      return frames;
    }
  }
}

function framesToTimecodeString(frames){

  let hours = Math.floor(frames/(60 * 60 * fps));
  let minutes = Math.floor((frames - (hours * 60 * 60 * fps))/(60 * fps));
  let seconds = Math.floor((frames - (hours * 60 * 60 * fps) - (minutes * 60 * fps))/fps)
  let theFrames = frames - (hours * 60 * 60 * fps) - (minutes * 60 * fps) - (seconds * fps)

  let timecode = zeroPad(hours, 2) + ':' + zeroPad(minutes, 2) + ':' + zeroPad(seconds, 2) + ':' + zeroPad(theFrames, 2);

  return timecode

}

/**
 * 
 * @returns {string}
 */
function nowAsTimecode(){

  const today = new Date();
  return zeroPad(today.getHours(), 2) + ':' + zeroPad(today.getMinutes(), 2) + ':' + zeroPad(today.getSeconds(), 2) + ':00'
}
/**
 * 
 * @param {number} seconds 
 * @returns {string}
 */
function nowPlusTimecode(seconds){
  return timecodeAddSeconds(nowAsTimecode(), seconds);
}

module.exports = {timecodeAdd, timecodeAddSeconds, nowAsTimecode, nowPlusTimecode, timecodeGreaterThan}