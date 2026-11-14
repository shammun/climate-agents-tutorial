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
  console.log('Generating ambient A-minor music with ffmpeg…');
  execSync(
    `ffmpeg -y ` +
    `-f lavfi -i "sine=frequency=110:duration=66" ` +
    `-f lavfi -i "sine=frequency=165:duration=66" ` +
    `-f lavfi -i "sine=frequency=220:duration=66" ` +
    `-f lavfi -i "sine=frequency=261:duration=66" ` +
    `-f lavfi -i "sine=frequency=330:duration=66" ` +
    `-filter_complex "[0]volume=0.18[a0];[1]volume=0.14[a1];[2]volume=0.16[a2];[3]volume=0.12[a3];[4]volume=0.10[a4];[a0][a1][a2][a3][a4]amix=inputs=5,aecho=0.6:0.7:80:0.3,afade=t=in:st=0:d=2,afade=t=out:st=63:d=3" ` +
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

await renderComposition('Explainer', 'explainer.mp4');
await renderComposition('BuildingAgents', 'building-agents.mp4');
