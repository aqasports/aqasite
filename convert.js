import fs from "fs";
import sharp from "sharp";

fs.readdirSync("./").forEach(file => {
  if (file.endsWith(".png")) {
    const out = file.replace(".png", ".webp");
    sharp(file)
      .toFile(out)
      .then(() => console.log(`✅ ${out} créé`))
      .catch(err => console.error(err));
  }
});
