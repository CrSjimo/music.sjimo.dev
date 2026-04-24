import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const dataDir = path.join(rootDir, 'data');
const publicDataDir = path.join(rootDir, 'public', 'data');
const generatedDir = path.join(rootDir, 'src', 'generated');
const generatedFilePath = path.join(generatedDir, 'songs.ts');

const readJson = (filePath) => JSON.parse(readFileSync(filePath, 'utf-8'));

const ensureDir = (dirPath) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

if (!existsSync(dataDir)) {
  throw new Error('data directory does not exist.');
}

const songFolders = readJson(path.join(dataDir, 'index.json'));
if (!Array.isArray(songFolders)) {
  throw new Error('data/index.json must be an array of song folder names.');
}

const records = [];

rmSync(publicDataDir, { recursive: true, force: true });
ensureDir(publicDataDir);

for (const folder of songFolders) {
  const songDir = path.join(dataDir, folder);
  const indexFilePath = path.join(songDir, 'index.json');

  if (!existsSync(indexFilePath)) {
    throw new Error(`missing index.json for song folder: ${folder}`);
  }

  const songData = readJson(indexFilePath);
  records.push({
    folder,
    data: songData,
  });

  const assets = songData.assets ?? {};
  const assetFiles = [assets.lyrics, assets.score].filter((name) => typeof name === 'string');

  for (const assetFile of assetFiles) {
    const sourceFilePath = path.join(songDir, assetFile);
    if (!existsSync(sourceFilePath)) {
      continue;
    }

    const targetSongDir = path.join(publicDataDir, folder);
    ensureDir(targetSongDir);
    cpSync(sourceFilePath, path.join(targetSongDir, assetFile));
  }
}

ensureDir(generatedDir);

const generatedSource = `import type { SongRecord } from '@/types/song';\n\nexport const songRecords: SongRecord[] = ${JSON.stringify(records, null, 2)};\n`;

writeFileSync(generatedFilePath, generatedSource, 'utf-8');

console.log(`Prepared ${records.length} songs.`);
