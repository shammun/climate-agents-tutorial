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
  // 120 BPM C-major arpeggio (C4-E4-G4-B4 cycling every 0.25s), punchy bass on beats, airy pad
  execSync(
    `ffmpeg -y ` +
    // Arpeggio notes (C4 E4 G4 B4 at 120 BPM, 8th notes = 0.25s each)
    `-f lavfi -i "aevalsrc=sin(2*PI*261.63*t)*if(lt(mod(t,1.0),0.22),0.55,0.0):c=mono:s=44100:d=66" ` +
    `-f lavfi -i "aevalsrc=sin(2*PI*329.63*t)*if(lt(mod(t-0.25,1.0),0.22),0.50,0.0):c=mono:s=44100:d=66" ` +
    `-f lavfi -i "aevalsrc=sin(2*PI*392.00*t)*if(lt(mod(t-0.50,1.0),0.22),0.48,0.0):c=mono:s=44100:d=66" ` +
    `-f lavfi -i "aevalsrc=sin(2*PI*493.88*t)*if(lt(mod(t-0.75,1.0),0.22),0.44,0.0):c=mono:s=44100:d=66" ` +
    // Bass: C2 on every beat (0.5s), short punch
    `-f lavfi -i "aevalsrc=sin(2*PI*65.41*t)*if(lt(mod(t,0.5),0.18),0.70,0.0):c=mono:s=44100:d=66" ` +
    // Mid harmony pad: C4+G4 sustained quietly
    `-f lavfi -i "aevalsrc=sin(2*PI*261.63*t)*0.12+sin(2*PI*392.00*t)*0.10+sin(2*PI*523.25*t)*0.09:c=mono:s=44100:d=66" ` +
    // High sparkle: C6 on every 2nd 8th note
    `-f lavfi -i "aevalsrc=sin(2*PI*1046.5*t)*if(lt(mod(t-0.25,0.5),0.12),0.22,0.0):c=mono:s=44100:d=66" ` +
    `-filter_complex ` +
    `"[0]volume=0.80[a0];[1]volume=0.72[a1];[2]volume=0.70[a2];[3]volume=0.65[a3];` +
    `[4]volume=0.75[a4];[5]volume=0.55[a5];[6]volume=0.40[a6];` +
    `[a0][a1][a2][a3][a4][a5][a6]amix=inputs=7,` +
    `aecho=0.5:0.4:60:0.25,` +
    `equalizer=f=200:t=o:w=100:g=3,` +
    `equalizer=f=4000:t=o:w=1000:g=2,` +
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
