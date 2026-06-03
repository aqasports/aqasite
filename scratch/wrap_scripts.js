const fs = require('fs');
const path = require('path');

const rootDir = 'c:/Users/dell/Desktop/aqasportsdotpro';

// 1. Update activities.astro
function updateActivities() {
  const filePath = path.join(rootDir, 'src', 'pages', 'activities.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  
  const targetScript = `<script>
        // Performance optimized animations`;
        
  if (content.includes('astro:page-load')) {
    console.log('activities.astro already updated');
    return;
  }
  
  // Locate the script tags
  const startIndex = content.indexOf('<script>');
  const endIndex = content.indexOf('</script>', startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find script tags in activities.astro');
    return;
  }
  
  const scriptContent = content.substring(startIndex + 8, endIndex);
  
  const newScript = `<script>
      document.addEventListener('astro:page-load', () => {${scriptContent}      });
    </script>`;
    
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + 9);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated activities.astro successfully');
}

// 2. Update infrastructure.astro
function updateInfrastructure() {
  const filePath = path.join(rootDir, 'src', 'pages', 'infrastructure.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('astro:page-load')) {
    console.log('infrastructure.astro already updated');
    return;
  }
  
  const startIndex = content.indexOf('<script>');
  const endIndex = content.indexOf('</script>', startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find script tags in infrastructure.astro');
    return;
  }
  
  const scriptContent = content.substring(startIndex + 8, endIndex);
  
  const newScript = `<script>
    document.addEventListener('astro:page-load', () => {${scriptContent}    });
  </script>`;
  
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + 9);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated infrastructure.astro successfully');
}

// 3. Update kids.astro (replaces DOMContentLoaded)
function updateKids() {
  const filePath = path.join(rootDir, 'src', 'pages', 'kids.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('astro:page-load')) {
    console.log('kids.astro already updated');
    return;
  }
  
  // kids.astro uses document.addEventListener("DOMContentLoaded", () => {
  const target = 'document.addEventListener("DOMContentLoaded", () => {';
  if (!content.includes(target)) {
    console.error('Could not find DOMContentLoaded in kids.astro');
    return;
  }
  
  const updatedContent = content.replace(target, 'document.addEventListener("astro:page-load", () => {');
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated kids.astro successfully');
}

// 4. Update tarifs.astro (replaces DOMContentLoaded)
function updateTarifs() {
  const filePath = path.join(rootDir, 'src', 'pages', 'tarifs.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('astro:page-load')) {
    console.log('tarifs.astro already updated');
    return;
  }
  
  // tarifs.astro has self-executing function and document.addEventListener('DOMContentLoaded', ...)
  // We want the entire function inside `astro:page-load`
  const startIndex = content.indexOf('<script is:inline define:vars={{ lang }}>');
  const endIndex = content.indexOf('</script>', startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find script tag in tarifs.astro');
    return;
  }
  
  const scriptContent = content.substring(startIndex + 40, endIndex);
  
  // Let's replace DOMContentLoaded inside, and wrap the whole block in astro:page-load
  let newInnerContent = scriptContent.replace("document.addEventListener('DOMContentLoaded', () => {", "");
  // remove the closing part of DOMContentLoaded which is:
  // "        });" right after "highlightBestValue();"
  newInnerContent = newInnerContent.replace("        });\n\n     })();", "        highlightBestValue();\n    })();");
  
  // Wrap entire script body in astro:page-load
  const newScript = `<script is:inline define:vars={{ lang }}>
    document.addEventListener('astro:page-load', () => {
      ${newInnerContent.trim()}
    });
  </script>`;
  
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + 9);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated tarifs.astro successfully');
}

// 5. Update cards.astro
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
    console.error('Could not find script tag in cards.astro');
    return;
  }
  
  const scriptContent = content.substring(startIndex + 8, endIndex);
  
  // Remove the DOMContentLoaded wrapper inside and let astro:page-load handle it
  let inner = scriptContent.replace("document.addEventListener('DOMContentLoaded', function() {", "");
  // We also need to remove its matching closing bracket.
  // In cards.astro:
  // document.addEventListener('DOMContentLoaded', function() {
  //   const cards = document.querySelectorAll('.card');
  //   ...
  //   });
  // });
  // Let's see: we can just wrap the whole script in astro:page-load, but change DOMContentLoaded to run immediately
  inner = inner.replace("document.addEventListener('DOMContentLoaded', function() {", "");
  
  // Actually, let's keep it simple: just wrap the entire script body in astro:page-load,
  // and inside it, replace document.addEventListener('DOMContentLoaded', function() { ... })
  // with an IIFE or just execute it directly.
  let newInner = scriptContent.replace("document.addEventListener('DOMContentLoaded', function() {", "(function() {");
  
  const newScript = `<script>
    document.addEventListener('astro:page-load', () => {
      ${newInner.trim()}
    });
  </script>`;
  
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + 9);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated cards.astro successfully');
}

// 6. Update infos.astro
function updateInfos() {
  const filePath = path.join(rootDir, 'src', 'pages', 'infos.astro');
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('astro:page-load')) {
    console.log('infos.astro already updated');
    return;
  }
  
  const startIndex = content.indexOf('<script>');
  const endIndex = content.indexOf('</script>', startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find script tags in infos.astro');
    return;
  }
  
  const scriptContent = content.substring(startIndex + 8, endIndex);
  
  const newScript = `<script>
    document.addEventListener('astro:page-load', () => {${scriptContent}    });
  </script>`;
  
  const updatedContent = content.substring(0, startIndex) + newScript + content.substring(endIndex + 9);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated infos.astro successfully');
}

// 7. Update server.js
function updateServer() {
  const filePath = path.join(rootDir, 'server.js');
  let content = fs.readFileSync(filePath, 'utf8');
  
  const oldStatic = "app.use(express.static(path.join(__dirname, 'dist')));";
  const newStatic = "app.use(express.static(path.join(__dirname, 'dist'), { extensions: ['html'] }));";
  
  if (content.includes("extensions: ['html']")) {
    console.log('server.js already updated');
    return;
  }
  
  if (!content.includes(oldStatic)) {
    console.error('Could not find express.static middleware in server.js');
    return;
  }
  
  const updatedContent = content.replace(oldStatic, newStatic);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('Updated server.js successfully');
}

// Run all updates
updateActivities();
updateInfrastructure();
updateKids();
updateTarifs();
updateCards();
updateInfos();
updateServer();
