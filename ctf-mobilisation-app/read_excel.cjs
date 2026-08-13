const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Copy of CTF ENTEBBE.xlsx');
const wb = XLSX.readFile(filePath);

console.log('Sheets:', JSON.stringify(wb.SheetNames));

wb.SheetNames.forEach(name => {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log('\n=== ' + name + ' (rows:' + data.length + ') ===');
  data.slice(0, 30).forEach((r, i) => {
    const filtered = r.map((v, ci) => v !== '' ? ci + ':' + v : null).filter(Boolean);
    if (filtered.length) console.log('R' + (i + 1) + ':', filtered.join(' | '));
  });
});
