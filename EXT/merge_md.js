const fs = require('fs');
const path = require('path');

const dir = path.resolve('c:/Users/neelo/OneDrive/Desktop/CODES/Project/EXT');
const outFile = path.join(dir, 'ALL_DOCUMENTATION.md');

// Get all .md files except the output file
const mdFiles = fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && f !== 'ALL_DOCUMENTATION.md')
    .sort();

let combined = '';
mdFiles.forEach(file => {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    combined += `## ${file}\n` + content + '\n\n---\n\n';
});

fs.writeFileSync(outFile, combined, 'utf8');
console.log('Created', outFile, 'with', mdFiles.length, 'files merged.');

// Delete original files
mdFiles.forEach(file => {
    const filePath = path.join(dir, file);
    fs.unlinkSync(filePath);
    console.log('Deleted', filePath);
});

console.log('All original markdown files have been removed.');
