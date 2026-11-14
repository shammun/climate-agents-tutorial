import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C, FONT, CLAMP, fi, fo, pop, StepHeader, Caption } from '../components/SpringCard.jsx';

const CX = 640, CY = 350, R = 190;
const D2R = Math.PI / 180;
const at = (deg, r = R) => [CX + r * Math.cos(deg * D2R), CY + r * Math.sin(deg * D2R)];

// Three nodes on a circle, clockwise from the top
const NODES = [
  { label: 'LLM thinks', color: C.teal, deg: -90, start: 20 },
  { label: 'Picks tool', color: C.blue, deg: 30, start: 50 },
  { label: 'Runs tool', color: C.amber, deg: 150, start: 80 },
];
const NODE_W = 190, NODE_H = 62;
const ARC_DEG = 120;
const ARC_LEN = R * ARC_DEG * D2R;

const arcPath = (fromDeg) => {
  const [x1, y1] = at(fromDeg);
  const [x2, y2] = at(fromDeg + ARC_DEG);
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`;
};

/** Simple cartoon brain */
const Brain = ({ scale }) => (
  <g transform={`translate(${CX} ${CY - 8}) scale(${scale})`}>
    <circle r={62} fill={C.rose} opacity={0.12} />
    <g stroke="#06121a" strokeWidth={4} strokeLinejoin="round">
      <path d="M-4 -40 C-30 -48 -50 -30 -46 -10 C-58 0 -54 24 -38 30 C-30 44 -10 44 -4 34 Z" fill="#fda4af" />
      <path d="M4 -40 C30 -48 50 -30 46 -10 C58 0 54 24 38 30 C30 44 10 44 4 34 Z" fill={C.rose} />
    </g>
    <g stroke="#06121a" strokeWidth={3.5} strokeLinecap="round" fill="none">
      <path d="M-34 -12 Q-22 -18 -16 -6" />
      <path d="M-38 12 Q-26 4 -14 14" />
      <path d="M34 -12 Q22 -18 16 -6" />
      <path d="M38 12 Q26 4 14 14" />
    </g>
  </g>
);

export const LoopScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const turn = frame < 90 ? 0 : Math.min(3, 1 + Math.floor((frame - 90) / 45));
  const brainIn = pop(frame, fps, 8);
  const pulse = 1 + 0.06 * Math.sin(frame / 5);

  // "Done" branch: forks off the top node to the right
  const doneLine = interpolate(frame, [180, 204], [0, 1], CLAMP);
  const doneBubble = pop(frame, fps, 200);
  const [tx, ty] = at(-90);
  const branchX1 = tx + NODE_W / 2 + 8, branchX2 = 962;
  const bubbleCx = 1085;

  // Question entering from the left
  const qIn = pop(frame, fps, 6);
  const qLine = interpolate(frame, [12, 30], [0, 1], CLAMP);
  const qX1 = 318, qX2 = tx - NODE_W / 2 - 8;

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fo(frame, 250), fontFamily: FONT }}>
      <StepHeader frame={frame} step={1} title="Understand the agent loop" color={C.teal} />

      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
        {/* Faint guide ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e293b" strokeWidth={2} strokeDasharray="4 10" opacity={fi(frame, 10)} />

        {/* Arcs draw themselves once both of their end nodes are on screen */}
        {NODES.map((n, i) => {
          const drawStart = [50, 80, 96][i];
          const p = interpolate(frame, [drawStart, drawStart + 28], [0, 1], CLAMP);
          return (
            <path key={`arc${i}`} d={arcPath(n.deg)} fill="none" stroke={n.color} strokeWidth={6}
              strokeLinecap="round" strokeDasharray={ARC_LEN} strokeDashoffset={ARC_LEN * (1 - p)} opacity={0.55} />
          );
        })}

        {/* Arrowheads chasing along the arcs */}
        {frame >= 90 && NODES.map((n, i) =>
          [0, 1, 2].map((k) => {
            const t = (((frame - 90) / 48 + k / 3) % 1 + 1) % 1;
            const deg = n.deg + 24 + t * (ARC_DEG - 48);
            const [x, y] = at(deg);
            const o = Math.min(1, t * 6, (1 - t) * 6) * fi(frame, 90, 12);
            return (
              <g key={`p${i}${k}`} transform={`translate(${x} ${y}) rotate(${deg + 90})`} opacity={o}>
                <circle r={13} fill={n.color} opacity={0.22} />
                <path d="M-9 -9 L11 0 L-9 9 L-4 0 Z" fill={n.color} stroke="#06121a" strokeWidth={2} strokeLinejoin="round" />
              </g>
            );
          })
        )}

        {/* Question arrow in */}
        <line x1={qX1} y1={ty} x2={qX1 + (qX2 - qX1) * qLine} y2={ty} stroke={C.muted} strokeWidth={4} strokeLinecap="round" />
        {qLine > 0.95 && <path d={`M${qX2 - 12} ${ty - 9} L${qX2 + 2} ${ty} L${qX2 - 12} ${ty + 9} Z`} fill={C.muted} />}

        {/* Done branch */}
        <line x1={branchX1} y1={ty} x2={branchX1 + (branchX2 - branchX1) * doneLine} y2={ty}
          stroke={C.gold} strokeWidth={4} strokeLinecap="round" strokeDasharray="10 8" opacity={frame >= 180 ? 1 : 0} />
        {doneLine > 0.95 && <path d={`M${branchX2 - 12} ${ty - 9} L${branchX2 + 2} ${ty} L${branchX2 - 12} ${ty + 9} Z`} fill={C.gold} />}

        <Brain scale={Math.max(0, brainIn) * pulse} />
      </svg>

      {/* Turn counter under the brain */}
      <div style={{
        position: 'absolute', left: CX - 80, top: CY + 62, width: 160, textAlign: 'center',
        fontSize: 17, fontWeight: 700, color: C.muted, opacity: turn > 0 ? 1 : 0,
      }}>
        loop {turn}
      </div>

      {/* Question bubble */}
      <div style={{
        position: 'absolute', left: 150, top: ty - 30, width: 160, height: 60, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${qIn})`, opacity: Math.min(1, qIn),
        background: '#0f172a', border: `2px solid ${C.muted}`, borderRadius: 30,
        color: C.text, fontSize: 21, fontWeight: 700, boxShadow: '0 5px 0 rgba(148,163,184,.3)',
      }}>
        Question
      </div>

      {/* Nodes */}
      {NODES.map((n) => {
        const [x, y] = at(n.deg);
        const s = pop(frame, fps, n.start);
        return (
          <div key={n.label} style={{
            position: 'absolute', left: x - NODE_W / 2, top: y - NODE_H / 2, width: NODE_W, height: NODE_H,
            boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${s})`, opacity: Math.min(1, s),
            background: '#0b1220', border: `3px solid ${n.color}`, borderRadius: 31,
            color: n.color, fontSize: 24, fontWeight: 800,
            boxShadow: `0 6px 0 ${n.color}55, 0 0 26px ${n.color}33`,
          }}>
            {n.label}
          </div>
        );
      })}

      {/* Branch label */}
      <div style={{
        position: 'absolute', left: branchX1, top: ty - 38, width: branchX2 - branchX1, textAlign: 'center',
        fontSize: 17, fontWeight: 700, color: C.gold, opacity: fi(frame, 196, 14),
      }}>
        no tool needed
      </div>

      {/* Final answer bubble */}
      <div style={{
        position: 'absolute', left: bubbleCx - 112, top: ty - 36, width: 224, height: 72, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        transform: `scale(${doneBubble})`, opacity: Math.min(1, doneBubble),
        background: C.gold, borderRadius: 36, color: '#1c1400', fontSize: 23, fontWeight: 800,
        boxShadow: '0 6px 0 #b45309, 0 0 34px rgba(251,191,36,.5)',
      }}>
        Final answer
        <svg width={26} height={26} viewBox="0 0 26 26">
          <circle cx={13} cy={13} r={13} fill="#1c1400" />
          <path d="M7 13.5 L11.5 18 L19.5 9" stroke={C.gold} strokeWidth={3.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <Caption frame={frame} start={110}>The agent loops until it has an answer</Caption>
    </AbsoluteFill>
  );
};
