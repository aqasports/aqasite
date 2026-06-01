const fs = require('fs');
const readline = require('readline');

const logPath = 'C:\\Users\\dell\\.gemini\\antigravity\\brain\\a7e350a2-45c8-405f-8116-54d01d2813e8\\.system_generated\\logs\\transcript.jsonl';

async function run() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let index = 0;
  for await (const line of rl) {
    const data = JSON.parse(line);
    const text = JSON.stringify(data);
    if (text.includes('reghaia') && text.includes('Coach Nouga')) {
      console.log(`Step ${data.step_index}: type=${data.type}, length=${text.length}`);
      // let's print a small snippet
      if (data.content && data.content.length > 500) {
        console.log('  Content length:', data.content.length);
      }
    }
    index++;
  }
}

run();
