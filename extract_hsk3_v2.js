const fs = require('fs');
const zlib = require('zlib');

const filePath = 'C:/Users/崔艺博/Desktop/HSK3词语表.docx';
const outPath = 'D:/Work/XueHanyu/hsk3_words.txt';
const data = fs.readFileSync(filePath);

function findCentralDirectory(buf) {
    for (let i = buf.length - 22; i >= 0; i--) {
        if (buf[i] === 0x50 && buf[i+1] === 0x4b && buf[i+2] === 0x05 && buf[i+3] === 0x06) return i;
    }
    return -1;
}

function getFileOffset(buf, cdOffset, targetName) {
    const numEntries = buf.readUInt16LE(cdOffset + 10);
    let cdOff = buf.readUInt32LE(cdOffset + 16);
    for (let i = 0; i < numEntries; i++) {
        const sig = buf.readUInt32LE(cdOff);
        if (sig !== 0x02014b50) break;
        const nameLen = buf.readUInt16LE(cdOff + 28);
        const extraLen = buf.readUInt16LE(cdOff + 30);
        const commentLen = buf.readUInt16LE(cdOff + 32);
        const localOff = buf.readUInt32LE(cdOff + 42);
        const name = buf.toString('utf8', cdOff + 46, cdOff + 46 + nameLen);
        if (name === targetName) return localOff;
        cdOff += 46 + nameLen + extraLen + commentLen;
    }
    return -1;
}

function extract(buf, localOff) {
    const nameLen = buf.readUInt16LE(localOff + 26);
    const extraLen = buf.readUInt16LE(localOff + 28);
    const compMethod = buf.readUInt16LE(localOff + 8);
    const compSize = buf.readUInt32LE(localOff + 18);
    const dataOff = localOff + 30 + nameLen + extraLen;
    const compressed = buf.slice(dataOff, dataOff + compSize);
    if (compMethod === 0) return compressed.toString('utf8');
    if (compMethod === 8) return zlib.inflateRawSync(compressed).toString('utf8');
    return null;
}

const cd = findCentralDirectory(data);
if (cd < 0) { fs.writeFileSync(outPath, 'ERROR: bad zip'); process.exit(1); }
const off = getFileOffset(data, cd, 'word/document.xml');
if (off < 0) { fs.writeFileSync(outPath, 'ERROR: document.xml not found'); process.exit(1); }
const xml = extract(data, off);

const lines = [];
const pRegex = /<w:p[ >][\s\S]*?<\/w:p>/g;
const tRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
let pm;
while ((pm = pRegex.exec(xml)) !== null) {
    let line = '';
    let tm;
    while ((tm = tRegex.exec(pm[0])) !== null) line += tm[1];
    lines.push(line);
}

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Done, wrote ' + lines.length + ' lines');
