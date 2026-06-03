const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const img4 = path.join(__dirname, '..', 'public', 'events', 'Fav img (4).jpg');
const img9 = path.join(__dirname, '..', 'public', 'events', 'Fav img (9).jpg');

async function compressImage(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('File does not exist:', filePath);
    return;
  }
  const stats = fs.statSync(filePath);
  console.log(`Original size of ${path.basename(filePath)}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  const tempPath = filePath + '.tmp.jpg';
  
  try {
    // Read file into buffer to avoid file locking on Windows
    const inputBuffer = fs.readFileSync(filePath);
    await sharp(inputBuffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(tempPath);

    const tempStats = fs.statSync(tempPath);
    console.log(`Compressed size: ${(tempStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Replace original file
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);
    console.log('Successfully compressed and replaced.');
  } catch (err) {
    console.error('Error compressing image:', err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

async function run() {
  await compressImage(img4);
  await compressImage(img9);
}

run();
