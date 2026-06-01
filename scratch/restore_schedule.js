const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\a7e350a2-45c8-405f-8116-54d01d2813e8\\.system_generated\\logs\\transcript.jsonl';
const targetPath = path.join(__dirname, '..', 'src', 'data', 'schedule.json');

async function run() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let rawContent = null;
  for await (const line of rl) {
    const data = JSON.parse(line);
    if (data.step_index === 541) {
      rawContent = data.content;
      break;
    }
  }

  if (!rawContent) {
    console.error('Could not find step 541 in logs!');
    return;
  }

  // Parse lines and strip line numbers
  const lines = rawContent.split('\n');
  const jsonLines = [];
  let startReading = false;

  for (const line of lines) {
    // Look for the line starting with "1: {" or "1: "
    if (!startReading) {
      if (line.trim().startsWith('1: {')) {
        startReading = true;
      } else {
        continue;
      }
    }

    // Strip line number prefix (e.g. "12: ")
    const match = line.match(/^\d+:\s?(.*)$/);
    if (match) {
      jsonLines.push(match[1]);
    } else {
      // If a line doesn't match the line number pattern (like the end of the file/viewer output), stop
      if (line.includes('The above content') || line.includes('Showing lines')) {
        break;
      }
      // If we already started reading but there is a non-matching line, it might be the end
      if (startReading && line.trim() === '') {
        continue;
      }
    }
  }

  const jsonStr = jsonLines.join('\n');
  console.log('Constructed JSON string:');
  console.log(jsonStr.substring(0, 500) + '\n...\n' + jsonStr.substring(jsonStr.length - 500));

  try {
    const parsed = JSON.parse(jsonStr);
    fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf8');
    console.log('SUCCESS: schedule.json restored and validated!');
  } catch (err) {
    console.error('Failed to parse constructed JSON:', err);
  }
}

run();
