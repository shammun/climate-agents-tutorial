import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Generate ambient A-minor music with ffmpeg
const assetsDir = path.join(__dirname, 'remotion', 'assets');
const publicDir = path.join(__dirname, 'remotion', 'public');
const musicPath = path.join(assetsDir, 'ambient.mp3');
const publicMusicPath = path.join(publicDir, 'ambient.mp3');

fs.mkdirSync(assetsDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

if (!fs.existsSync(musicPath)) {
  console.log('Generating upbeat music with ffmpeg…');
  // C-major chord (C2 bass, C3, C4, E4, G4, C5, E5) with tremolo pulsing for rhythm
  execSync(
    `ffmpeg -y ` +
    `-f lavfi -i "sine=frequency=65:duration=66" ` +
    `-f lavfi -i "sine=frequency=130:duration=66" ` +
    `-f lavfi -i "sine=frequency=261:duration=66" ` +
    `-f lavfi -i "sine=frequency=329:duration=66" ` +
    `-f lavfi -i "sine=frequency=392:duration=66" ` +
    `-f lavfi -i "sine=frequency=523:duration=66" ` +
    `-f lavfi -i "sine=frequency=659:duration=66" ` +
    `-filter_complex ` +
    `"[0]volume=0.60,tremolo=f=2:d=0.95[b];` +
    `[1]volume=0.28,tremolo=f=2:d=0.90[c3];` +
    `[2]volume=0.42,tremolo=f=4:d=0.88[c4];` +
    `[3]volume=0.36,tremolo=f=4:d=0.88[e4];` +
    `[4]volume=0.32,tremolo=f=4:d=0.88[g4];` +
    `[5]volume=0.38,tremolo=f=8:d=0.82[c5];` +
    `[6]volume=0.26,tremolo=f=8:d=0.82[e5];` +
    `[b][c3][c4][e4][g4][c5][e5]amix=inputs=7,` +
    `aecho=0.5:0.4:55:0.22,` +
    `equalizer=f=180:t=o:w=80:g=4,` +
    `equalizer=f=3500:t=o:w=800:g=3,` +
    `afade=t=in:st=0:d=1.5,afade=t=out:st=63:d=3" ` +
    `-t 66 "${musicPath}"`,
    { stdio: 'inherit' }
  );
  console.log('Music generated.');
}

// Copy music to Remotion public dir so staticFile() can find it
fs.copyFileSync(musicPath, publicMusicPath);

const outDir = path.join(__dirname, 'dist', 'videos');
fs.mkdirSync(outDir, { recursive: true });

console.log('Bundling Remotion compositions…');
const bundled = await bundle({
  entryPoint: path.join(__dirname, 'remotion', 'index.jsx'),
  webpackOverride: (config) => config,
  publicDir: path.join(__dirname, 'remotion', 'public'),
});

async function renderComposition(id, outFile) {
  const composition = await selectComposition({
    serveUrl: bundled,
    id,
    inputProps: {},
  });
  const outPath = path.join(outDir, outFile);
  console.log(`\nRendering ${id}: ${composition.durationInFrames} frames at ${composition.fps}fps…`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outPath,
    inputProps: {},
    concurrency: 2,
    onProgress: ({ progress }) => {
      process.stdout.write(`\r  ${(progress * 100).toFixed(1)}%   `);
    },
  });
  console.log(`\nDone → ${outPath}`);
}

await renderComposition('BuildingAgents', 'building-agents.mp4');
