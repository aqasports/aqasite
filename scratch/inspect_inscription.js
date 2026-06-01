const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'dist', 'inscription.html');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log('File length:', content.length);
  
  // Find where "Youcef" is
  const idx = content.indexOf('Youcef');
  if (idx !== -1) {
    console.log('Found Youcef at index:', idx);
    console.log(content.substring(idx - 100, idx + 200));
  } else {
    console.log('Youcef not found in file.');
  }

  // Find where "schedule" is
  const sIdx = content.indexOf('schedule');
  if (sIdx !== -1) {
    console.log('Found schedule at index:', sIdx);
    console.log(content.substring(sIdx - 100, sIdx + 200));
  } else {
    console.log('schedule not found in file.');
  }
} catch (err) {
  console.error('Error:', err);
}
