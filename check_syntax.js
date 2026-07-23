const fs = require('fs');
const f = fs.readFileSync('D:/Work/XueHanyu/index.html', 'utf8');

// Check for syntax issues
console.log('File size:', f.length, 'bytes');
console.log('Lines:', f.split('\n').length);

// Find key functions
for (const name of ['renderVocabLevelProgress', 'analyzeVocabBatch', 'mergeVocabResults', 'generateVocabPractice']) {
    const idx = f.indexOf('function ' + name);
    if (idx >= 0) {
        const line = f.substring(0, idx).split('\n').length;
        // Show 200 chars of the function
        const snippet = f.substring(idx, idx + 300).replace(/\n/g, '\\n');
        console.log('\n✓ ' + name + ' at line ' + line + ':');
        console.log('  ' + snippet);
    } else {
        console.log('\n✗ ' + name + ' NOT FOUND');
    }
}

// Check for broken template literals or syntax
const openBraces = (f.match(/\{/g)||[]).length;
const closeBraces = (f.match(/\}/g)||[]).length;
console.log('\nBraces: { =', openBraces, ', } =', closeBraces, ', diff =', openBraces - closeBraces);

const openParens = (f.match(/\(/g)||[]).length;
const closeParens = (f.match(/\)/g)||[]).length;
console.log('Parens: ( =', openParens, ', ) =', closeParens, ', diff =', openParens - closeParens);

const backticks = (f.match(/`/g)||[]).length;
console.log('Backticks:', backticks, '(should be even:', backticks % 2 === 0, ')');

// Check the script tag
const scriptStart = f.indexOf('<script>');
const scriptEnd = f.lastIndexOf('</script>');
console.log('\n<script> at', scriptStart, '</script> at', scriptEnd);
console.log('Script content length:', scriptEnd - scriptStart - 8);
