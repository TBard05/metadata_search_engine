import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const FILES_DIR = process.env.FILES_DIR || 'files';

const handlers = new Map([
  ['.jpg',  ['./imageHandler.js', 'processImageFile']],
  ['.jpeg', ['./imageHandler.js', 'processImageFile']],
  ['.png',  ['./imageHandler.js', 'processImageFile']],
  ['.heic', ['./imageHandler.js', 'processImageFile']],
  ['.mp3',  ['./audioHandler.js', 'processAudioFile']],
  ['.wav',  ['./audioHandler.js', 'processAudioFile']],
  ['.flac', ['./audioHandler.js', 'processAudioFile']],
  ['.pdf',  ['./pdfHandler.js',   'processPdfFile'   ]],
  ['.docx', ['./docxHandler.js',  'processDocxFile'  ]]
]);

function isFile(p) {
  try { return fs.statSync(p).isFile(); } catch { return false; }
}

async function processOne(filename) {
  const ext = path.extname(filename).toLowerCase();
  const h = handlers.get(ext);
  if (!h) { 
    console.log(`Skippa (stöder ej): ${filename}`); 
    return; 
  }

  const [modulePath, fnName] = h;
  const mod = await import(modulePath);
  const fn = mod[fnName];
  if (typeof fn !== 'function') {
    console.warn(`Handler saknas: ${modulePath} :: ${fnName}`);
    return;
  }

  const relPath = path.join(FILES_DIR, filename);
  await fn(relPath);
}

async function main() {
  const dir = FILES_DIR;
  if (!fs.existsSync(dir)) {
    console.error(`Mapp saknas: ${dir}`);
    process.exit(1);
  }

  const names = fs.readdirSync(dir).filter(n => isFile(path.join(dir, n)));
  if (names.length === 0) {
    console.log(`(Tom mapp) Inget att läsa i: ${dir}`);
    return;
  }

  console.log(`Läser in ${names.length} fil(er) från ${dir} ...`);
  for (const name of names) {
    try {
      await processOne(name);
    } catch (err) {
      console.error(`Fel för ${name}: ${err.message}`);
    }
  }
  console.log('Klar.');
}

await main();
