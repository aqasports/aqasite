const fs = require('fs');
const path = require('path');

const distInscriptionPath = path.join(__dirname, '..', 'dist', 'inscription.html');
const targetPath = path.join(__dirname, '..', 'src', 'data', 'schedule.json');

try {
  const content = fs.readFileSync(distInscriptionPath, 'utf8');
  // Look for data-schedule in the html
  // Example pattern: data-schedule="..."
  // Let's use a regex to capture it.
  const match = content.match(/data-schedule="({.*?})"/);
  if (match) {
    // HTML entities like &quot; need to be decoded
    let jsonStr = match[1]
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    const parsed = JSON.parse(jsonStr);
    fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf8');
    console.log('SUCCESS: schedule.json successfully recovered from dist/inscription.html!');
  } else {
    // Try matching scheduleData in scripts
    const scriptMatch = content.match(/scheduleData\s*=\s*(\{[\s\S]*?\});/);
    if (scriptMatch) {
      const parsed = JSON.parse(scriptMatch[1]);
      fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf8');
      console.log('SUCCESS: schedule.json successfully recovered from script in dist/inscription.html!');
    } else {
      console.error('Could not find schedule data in dist/inscription.html');
    }
  }
} catch (err) {
  console.error('Error reading dist/inscription.html:', err);
}
