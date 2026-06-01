const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'AQA GROUPS MANAGER.html');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File length:', content.length);
  
  // Find where "Abdelghani" is
  const idx = content.indexOf('Abdelghani');
  if (idx !== -1) {
    console.log('Found Abdelghani at index:', idx);
    console.log(content.substring(idx - 100, idx + 400));
  } else {
    console.log('Abdelghani not found.');
  }

  // Find where "Youcef" is
  const yIdx = content.indexOf('Youcef');
  if (yIdx !== -1) {
    console.log('Found Youcef at index:', yIdx);
    console.log(content.substring(yIdx - 100, yIdx + 400));
  } else {
    console.log('Youcef not found.');
  }
} catch (err) {
  console.error('Error:', err);
}
