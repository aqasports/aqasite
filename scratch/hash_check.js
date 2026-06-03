const crypto = require('crypto');
const pwd = 'AqaSports2026!';
const hash = crypto.createHash('sha256').update(pwd).digest('hex');
console.log('Password hash of AqaSports2026!:');
console.log(hash);
