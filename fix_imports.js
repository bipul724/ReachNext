const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./crm/app/(dashboard)');

files.forEach(file => {
  if (file.endsWith('dashboard/page.tsx')) return; // already correct
  
  let content = fs.readFileSync(file, 'utf8');
  
  if (file.endsWith('layout.tsx') && file.split('/').length === 4) {
    // crm/app/(dashboard)/layout.tsx
    content = content.replace(/from "\.\.\/\.\.\/\.\.\/components/g, 'from "../../components');
  } else {
    // Fix the double replacement: ../../../../../ -> ../../../../
    content = content.replace(/from "\.\.\/\.\.\/\.\.\/\.\.\/\.\.\//g, 'from "../../../../');
  }
  
  fs.writeFileSync(file, content, 'utf8');
});

console.log('Fixed imports');
