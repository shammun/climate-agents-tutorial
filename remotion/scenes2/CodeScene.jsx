import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { C, FONT, MONO, CLAMP, fi, fo, pop, BOUNCY, StepHeader } from '../components/SpringCard.jsx';
import { TypedCode, typingSchedule } from '../components/TypedCode.jsx';

const CODE = `# AGENTS.md
name: climate-analyst
description: Analyses ERA5 temperature data
tools:
  - Read
  - Bash
  - Write
instructions: |
  You are a climate scientist.
  Compute seasonal temperature anomalies.
  Write results to data/processed/.`;

const TYPE_START = 24, CPF = 3, PAUSE = 6;
const FONT_SIZE = 20, LINE_H = 34, PAD = 22, HEADER_H = 46;
const WIN = { left: 96, top: 116, width: 760, height: HEADER_H + PAD * 2 + LINE_H * 11 };

const SCHEDULE = typingSchedule(CODE, TYPE_START, CPF, PAUSE);

// Callouts appear when the matching line has been typed
const NOTES = [
  { line: 1, title: 'Who', text: 'a name and a one-line job description', color: C.teal },
  { line: 3, title: 'Tools', text: 'what the agent is allowed to use', color: C.blue },
  { line: 7, title: 'Instructions', text: 'how to do the work, in plain language', color: C.amber },
];

/** Cartoon pointing hand (points right) */
const Hand = () => (
  <svg width={64} height={48} viewBox="0 0 64 48" style={{ overflow: 'visible' }}>
    <g stroke="#06121a" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round">
      <rect x={0} y={12} width={14} height={26} rx={4} fill={C.teal} />
      <path d="M14 14 H30 Q34 8 40 10 H56 Q62 10 62 15 Q62 20 56 20 H42 Q46 22 45 26 Q46 30 43 32 Q44 36 40 38 Q40 42 34 42 H22 Q16 42 14 38 Z" fill="#fde68a" />
      <path d="M42 20 H34 M45 26 H36 M43 32 H35 M40 38 H33" fill="none" />
    </g>
  </svg>
);

export const CodeScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slide = spring({ frame, fps, config: { stiffness: 90, damping: 16 }, durationInFrames: 22 });
  const winX = interpolate(slide, [0, 1], [900, 0]);

  // Hand rests on a line while it is typed and glides to the next one during the pause
  const input = [], output = [];
  SCHEDULE.forEach((l, i) => { input.push(l.start, l.end); output.push(i, i); });
  const handLine = interpolate(frame, input, output, CLAMP);
  const typingEnd = SCHEDULE[SCHEDULE.length - 1].end;
  const handOp = fi(frame, TYPE_START - 8, 8) * interpolate(frame, [typingEnd + 14, typingEnd + 30], [1, 0], CLAMP);
  const handX = Math.sin(frame / 4) * 5;
  const codeTop = WIN.top + HEADER_H + PAD;

  const saved = pop(frame, fps, typingEnd + 16);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fo(frame, 250), fontFamily: FONT }}>
      <StepHeader frame={frame} step={3} title="Describe the agent" color={C.amber} />

      {/* Editor window */}
      <div style={{
        position: 'absolute', ...WIN, transform: `translateX(${winX}px)`,
        background: '#0b1220', border: '2px solid #1e293b', borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 10px 0 #020617, 0 30px 70px rgba(0,0,0,.6), 0 0 40px rgba(45,212,191,.12)',
      }}>
        <div style={{
          height: HEADER_H, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px',
          background: '#111a2e', borderBottom: '2px solid #1e293b',
        }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
          ))}
          <div style={{ flex: 1, textAlign: 'center', fontFamily: MONO, fontSize: 16, color: C.muted, marginRight: 60 }}>
            AGENTS.md
          </div>
          <div style={{
            fontSize: 13, fontWeight: 800, color: '#06121a', background: C.green, borderRadius: 20, padding: '3px 12px',
            transform: `scale(${saved})`, opacity: Math.min(1, saved),
          }}>
            Saved
          </div>
        </div>
        <TypedCode code={CODE} frame={frame} startFrame={TYPE_START} charsPerFrame={CPF} linePause={PAUSE}
          fontSize={FONT_SIZE} lineHeight={LINE_H} lineNumbers style={{ padding: `${PAD}px 26px ${PAD}px 30px` }} />
      </div>

      {/* Hand cursor in the left margin, pointing at the line being typed */}
      <div style={{
        position: 'absolute', left: WIN.left - 62 + handX + winX, top: codeTop + handLine * LINE_H - 7,
        opacity: handOp,
      }}>
        <Hand />
      </div>

      {/* Callouts */}
      {NOTES.map((n, k) => {
        const start = SCHEDULE[n.line].end + 2;
        const s = spring({ frame: frame - start, fps, config: BOUNCY });
        const y = WIN.top + 40 + k * 136;
        return (
          <div key={n.title} style={{
            position: 'absolute', left: 900, top: y, width: 310,
            transform: `scale(${s})`, transformOrigin: 'left center', opacity: Math.min(1, s),
            background: `${n.color}18`, border: `1.5px solid ${n.color}66`, borderLeft: `6px solid ${n.color}`,
            borderRadius: 14, padding: '12px 18px', boxSizing: 'border-box',
            boxShadow: `0 0 20px ${n.color}1a`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: n.color }}>{n.title}</div>
            <div style={{ fontSize: 17, color: C.soft, marginTop: 3, lineHeight: 1.35 }}>{n.text}</div>
          </div>
        );
      })}

      <div style={{
        position: 'absolute', left: 0, right: 0, top: 648, textAlign: 'center',
        fontSize: 24, fontWeight: 600, color: C.soft, opacity: fi(frame, typingEnd + 10),
      }}>
        An agent is a short text file: a name, some tools, and instructions
      </div>
    </AbsoluteFill>
  );
};
