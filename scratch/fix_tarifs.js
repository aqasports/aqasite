const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/dell/Desktop/aqasportsdotpro/src/pages/tarifs.astro';
let content = fs.readFileSync(filePath, 'utf8');

const target = `<script is:inline define:vars={{ lang }}>
    (function(){`;

if (!content.includes(target)) {
  console.error("Target script header not found!");
  process.exit(1);
}

// Let's replace the top
content = content.replace(target, `<script is:inline define:vars={{ lang }}>
    document.addEventListener('astro:page-load', () => {
      (function(){`);

// Let's replace the DOMContentLoaded listener and bottom of the IIFE
const domContentTarget = `        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            highlightBestValue();
        });

    })();
    </script>`;

const replacement = `        // Initialize
        highlightBestValue();

      })();
    });
    </script>`;

if (!content.includes(domContentTarget)) {
  console.error("Target initializer block not found!");
  process.exit(1);
}

content = content.replace(domContentTarget, replacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully fixed tarifs.astro!");
