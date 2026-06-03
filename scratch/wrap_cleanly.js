const fs = require('fs');
const path = require('path');

const rootDir = 'c:/Users/dell/Desktop/aqasportsdotpro';

// Helper to wrap a script block cleanly
function wrapScriptBlock(filePath, attributes = '') {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('astro:page-load')) {
    console.log(`${path.basename(filePath)} already updated`);
    return;
  }
  
  const searchTag = `<script${attributes}>`;
  const startIndex = content.indexOf(searchTag);
  const endIndex = content.indexOf('</script>', startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error(`Could not find script tags in ${path.basename(filePath)}`);
    return;
  }
  
  const scriptContent = content.substring(startIndex + searchTag.length, endIndex);
  
  const newScript = `<script${attributes}>
    document.addEventListener('astro:page-load', () => {${scriptContent}    });
  </script>`;
  
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + 9);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`Updated ${path.basename(filePath)} successfully`);
}

// 1. formation.astro
wrapScriptBlock(path.join(rootDir, 'src', 'pages', 'formation.astro'));

// 2. activities.astro
wrapScriptBlock(path.join(rootDir, 'src', 'pages', 'activities.astro'));

// 3. infos.astro
wrapScriptBlock(path.join(rootDir, 'src', 'pages', 'infos.astro'));

// 4. kids.astro (Replace DOMContentLoaded with astro:page-load)
function updateKids() {
  const filePath = path.join(rootDir, 'src', 'pages', 'kids.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('astro:page-load')) {
    console.log('kids.astro already updated');
    return;
  }
  const target = 'document.addEventListener("DOMContentLoaded", () => {';
  if (!content.includes(target)) {
    console.error('Could not find DOMContentLoaded in kids.astro');
    return;
  }
  content = content.replace(target, 'document.addEventListener("astro:page-load", () => {');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated kids.astro successfully');
}
updateKids();

// 5. tarifs.astro
function updateTarifs() {
  const filePath = path.join(rootDir, 'src', 'pages', 'tarifs.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('astro:page-load')) {
    console.log('tarifs.astro already updated');
    return;
  }
  
  // Find script block starting
  const searchTag = '<script>';
  const startIndex = content.indexOf(searchTag);
  const endIndex = content.indexOf('</script>', startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find script block in tarifs.astro');
    return;
  }
  
  let scriptBody = content.substring(startIndex + searchTag.length, endIndex);
  
  // Remove DOMContentLoaded listener inside
  const targetDcl = /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\)\s*=>\s*\{/g;
  scriptBody = scriptBody.replace(targetDcl, '');
  
  // Remove corresponding closing brace and IIFE closing cleanly
  scriptBody = scriptBody.replace(/highlightBestValue\(\);\s*\}\);/g, 'highlightBestValue();');
  
  // Wrap entire scriptBody in astro:page-load
  const newScript = `<script>
    document.addEventListener('astro:page-load', () => {
${scriptBody}    });
  </script>`;
    
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + 9);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated tarifs.astro successfully');
}
updateTarifs();

// 6. cards.astro
function updateCards() {
  const filePath = path.join(rootDir, 'src', 'pages', 'cards.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('astro:page-load')) {
    console.log('cards.astro already updated');
    return;
  }
  
  const startIndex = content.indexOf('<script>');
  const endIndex = content.indexOf('</script>', startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find script block in cards.astro');
    return;
  }
  
  let scriptBody = content.substring(startIndex + '<script>\n'.length, endIndex);
  
  // Remove DOMContentLoaded wrapper
  scriptBody = scriptBody.replace(`// ===== Cards toggle =====
document.addEventListener('DOMContentLoaded', function() {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      cards.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-expanded','false');
      });
      if (!isActive) {
        card.classList.add('active');
        card.setAttribute('aria-expanded','true');
      }
    });
  });
});`, `// ===== Cards toggle =====
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      cards.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-expanded','false');
      });
      if (!isActive) {
        card.classList.add('active');
        card.setAttribute('aria-expanded','true');
      }
    });
  });`);
  
  // Wrap entire scriptBody in astro:page-load
  const newScript = `<script>
    document.addEventListener('astro:page-load', () => {
${scriptBody}    });
  </script>`;
  
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + '</script>'.length);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated cards.astro successfully');
}
updateCards();
