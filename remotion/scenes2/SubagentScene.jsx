import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C, FONT, MONO, CLAMP, fi, fo, pop, StepHeader, Caption } from '../components/SpringCard.jsx';

const MAIN = { x: 640, y: 150, w: 280, h: 78 };
const SUB_Y = 372, SUB_W = 290, SUB_H = 78, BUBBLE_H = 92;

const SUBS = [
  { name: 'data-fetcher', job: 'downloads ERA5', color: C.blue, x: 230, start: 50, result: ['ERA5 files saved', 'to data/raw/'] },
  { name: 'climate-analyst', job: 'computes trends', color: C.purple, x: 640, start: 70, result: ['trends computed', 'to data/processed/'] },
  { name: 'results-reviewer', job: 'validates output', color: C.rose, x: 1050, start: 90, result: ['checks passed', 'VERDICT: OK'] },
];

const lerp = (a, b, t) => a + (b - a) * t;

/** Small envelope that carries a message along a spoke */
const Envelope = ({ x, y, color, opacity }) => (
  <g transform={`translate(${x} ${y})`} opacity={opacity}>
    <circle r={22} fill={color} opacity={0.22} />
    <rect x={-15} y={-10} width={30} height={20} rx={4} fill={color} stroke="#06121a" strokeWidth={3} />
    <path d="M-13 -8 L0 3 L13 -8" stroke="#06121a" strokeWidth={3} fill="none" strokeLinejoin="round" />
  </g>
);

export const SubagentScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainIn = pop(frame, fps, 10);
  const done = frame >= 220;
  const donePop = pop(frame, fps, 220);
  const donePulse = done ? 1 + 0.05 * Math.sin((frame - 220) / 3) * Math.max(0, 1 - (frame - 220) / 45) : 1;
  const mainColor = done ? C.green : C.teal;

  const y1 = MAIN.y + MAIN.h / 2 + 8, y2 = SUB_Y - SUB_H / 2 - 10;

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fo(frame, 250), fontFamily: FONT }}>
      <StepHeader frame={frame} step={5} title="Delegate to subagents" color={C.rose} />

      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
        {SUBS.map((s, i) => {
          const x1 = MAIN.x + (i - 1) * 90;
          const len = Math.hypot(s.x - x1, y2 - y1);
          const draw = interpolate(frame, [30 + i * 6, 54 + i * 6], [0, 1], CLAMP);
          // Delegation travels down (frames 60–110), results travel up (160–200)
          const down = interpolate(frame, [62 + i * 10, 100 + i * 10], [0, 1], CLAMP);
          const up = interpolate(frame, [160 + i * 6, 196 + i * 6], [0, 1], CLAMP);
          const showDown = down > 0 && down < 1;
          const showUp = up > 0 && up < 1;
          return (
            <g key={s.name}>
              <line x1={x1} y1={y1} x2={s.x} y2={y2} stroke={s.color} strokeWidth={4} strokeLinecap="round"
                strokeDasharray={len} strokeDashoffset={len * (1 - draw)} opacity={0.6} />
              {showDown && <Envelope x={lerp(x1, s.x, down)} y={lerp(y1, y2, down)} color={C.teal} opacity={Math.min(1, down * 8, (1 - down) * 8)} />}
              {showUp && <Envelope x={lerp(s.x, x1, up)} y={lerp(y2, y1, up)} color={C.green} opacity={Math.min(1, up * 8, (1 - up) * 8)} />}
            </g>
          );
        })}
      </svg>

      {/* Direction legend */}
      <div style={{ position: 'absolute', left: 64, top: 232, fontSize: 18, fontWeight: 700, color: C.teal, opacity: fi(frame, 60, 12) * fo(frame, 150, 12) }}>
        ↓ tasks go down
      </div>
      <div style={{ position: 'absolute', left: 64, top: 232, fontSize: 18, fontWeight: 700, color: C.green, opacity: fi(frame, 162, 12) }}>
        ↑ results come back
      </div>

      {/* Main agent */}
      <div style={{
        position: 'absolute', left: MAIN.x - MAIN.w / 2, top: MAIN.y - MAIN.h / 2, width: MAIN.w, height: MAIN.h,
        boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        transform: `scale(${mainIn * donePulse})`, opacity: Math.min(1, mainIn),
        background: done ? '#052e1f' : '#06262a', border: `3px solid ${mainColor}`, borderRadius: 20,
        color: mainColor, fontSize: 28, fontWeight: 800,
        boxShadow: `0 7px 0 ${mainColor}55, 0 0 ${done ? 50 : 26}px ${mainColor}${done ? '88' : '33'}`,
      }}>
        Main agent
        {done && (
          <span style={{
            fontSize: 17, fontWeight: 800, color: '#052e1f', background: C.green, borderRadius: 20, padding: '4px 14px',
            transform: `scale(${donePop})`, display: 'inline-block',
          }}>
            Done
          </span>
        )}
      </div>

      {/* Subagents, each with its own context bubble */}
      {SUBS.map((s, i) => {
        const sIn = pop(frame, fps, s.start);
        const workStart = 104 + i * 10, workEnd = 150 + i * 6;
        const working = frame >= workStart && frame < workEnd;
        const finished = frame >= workEnd;
        const dots = 1 + (Math.floor((frame - workStart) / 6) % 3);
        const bubbleIn = pop(frame, fps, s.start + 14);
        const fill = interpolate(frame, [workStart, workEnd], [0, 1], CLAMP);
        const typed = Math.floor(interpolate(frame, [workEnd, workEnd + 16], [0, 40], CLAMP));
        return (
          <div key={s.name}>
            <div style={{
              position: 'absolute', left: s.x - SUB_W / 2, top: SUB_Y - SUB_H / 2, width: SUB_W, height: SUB_H,
              boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              transform: `scale(${sIn})`, opacity: Math.min(1, sIn),
              background: `${s.color}18`, border: `2.5px solid ${s.color}`, borderRadius: 18,
              boxShadow: `0 6px 0 ${s.color}55, 0 0 22px ${s.color}2a`,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: s.color }}>{s.name}</div>
              <div style={{ fontSize: 17, color: C.soft, marginTop: 2 }}>{s.job}</div>
            </div>

            <div style={{
              position: 'absolute', left: s.x - SUB_W / 2 + 16, top: SUB_Y + SUB_H / 2 + 26, width: SUB_W - 32, height: BUBBLE_H,
              boxSizing: 'border-box', transform: `scale(${bubbleIn})`, transformOrigin: 'center top',
              opacity: Math.min(1, bubbleIn), overflow: 'hidden',
              background: '#0b1220', border: `2px dashed ${s.color}99`, borderRadius: 14, padding: '8px 14px',
            }}>
              {/* Fill level rises while the subagent works */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${fill * 100}%`, background: `${s.color}1f` }} />
              <div style={{ position: 'relative', fontSize: 12, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: `${s.color}` }}>
                own context
              </div>
              <div style={{ position: 'relative', fontFamily: MONO, fontSize: 17, color: C.text, marginTop: 5, lineHeight: 1.35, whiteSpace: 'pre' }}>
                {working && <span style={{ fontSize: 30, lineHeight: '34px', letterSpacing: 4, color: s.color }}>{'•'.repeat(dots)}</span>}
                {finished && s.result.join('\n').slice(0, typed)}
              </div>
            </div>
          </div>
        );
      })}

      <Caption frame={frame} start={120} y={648}>
        Each subagent works in its own context and reports back a short result
      </Caption>
    </AbsoluteFill>
  );
};
