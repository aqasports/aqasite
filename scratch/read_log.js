const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\a7e350a2-45c8-405f-8116-54d01d2813e8\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const data = JSON.parse(line);
    if (data.step_index === 557) {
      console.log('Step 557 Content:');
      console.log(data.content);
      break;
    }
  }
}

run();
