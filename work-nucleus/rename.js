const fs = require('fs');
const path = require('path');

const directoryToSearch = 'd:\\Referal Based\\questedge-ai\\questedge';
const ignoreDirs = ['node_modules', '.next', 'dist', '.git', 'scratch'];

const replacements = [
  { regex: /QuestEdge/g, replacement: 'QuestEdge' },
  { regex: /questedge/g, replacement: 'questedge' },
  { regex: /QuestEdge/g, replacement: 'QuestEdge' },
  { regex: /questedge/g, replacement: 'questedge' },
  { regex: /questedge/g, replacement: 'questedge' },
  { regex: /questedge/g, replacement: 'questedge' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        processDirectory(fullPath);
      }
    } else {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let newContent = originalContent;
    
    for (const { regex, replacement } of replacements) {
      newContent = newContent.replace(regex, replacement);
    }
    
    if (newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

processDirectory(directoryToSearch);
console.log("Done");
