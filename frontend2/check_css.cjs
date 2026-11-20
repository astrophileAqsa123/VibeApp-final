const fs = require('fs');
const path = require('path');

const basePath = 'd:/VibeApp-final/VibeApp-final/frontend2';
const build = fs.readFileSync(path.join(basePath, 'src/pages/Build.jsx'), 'utf8');
const appCss = fs.readFileSync(path.join(basePath, 'src/App.css'), 'utf8');

const regex = /className=["'`]([^"'`]+)["'`]/g;
let match;
const classes = new Set();
while ((match = regex.exec(build)) !== null) {
  match[1].split(/\s+/).forEach(c => {
    const clean = c.replace(/[^a-zA-Z0-9_-]/g, '');
    if (clean) classes.add(clean);
  });
}

console.log('Total classes in Build.jsx:', classes.size);

const foundInAppCss = [];
const missingFromAppCss = [];

for (const c of classes) {
  const dotClass = '.' + c;
  if (appCss.includes(dotClass)) {
    foundInAppCss.push(c);
  } else {
    missingFromAppCss.push(c);
  }
}

console.log('Found in App.css:', foundInAppCss.length);
console.log(JSON.stringify(foundInAppCss.sort(), null, 2));

console.log('Missing from App.css:', missingFromAppCss.length);
console.log(JSON.stringify(missingFromAppCss.sort(), null, 2));

console.log('\n--- Searching for build keywords / line numbers in App.css ---');
const lines = appCss.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('build-') || line.includes('.build') || line.toLowerCase().includes('build page') || line.includes('prompt-input')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
