const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/en/aqacontrol2026',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('CONTENT-TYPE:', res.headers['content-type']);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
