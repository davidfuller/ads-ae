const path = require('path');
const fs = require('fs').promises


async function savePages(pages, userPath){
  let filename = path.join(userPath,'pages.json');
  console.log(JSON.stringify(pages, null, 4));
  await fs.writeFile(filename,JSON.stringify(pages, null, 4));
}

async function readPages(userPath){
  let filename = path.join(userPath,'pages.json');
  let data = await fs.readFile(filename);
  return JSON.parse(data);
}

async function readSettings(userPath){
  let filename = path.join(userPath, 'settings.json');
  let data = await fs.readFile(filename);
  return JSON.parse(data);
}


module.exports = {savePages, readPages, readSettings}