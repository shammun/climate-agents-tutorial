import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C, FONT, MONO, CLAMP, fi, fo, pop, SpringCard, StepHeader, Caption } from '../components/SpringCard.jsx';

const ICON = { stroke: '#06121a', strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' };

const GlobeIcon = ({ color }) => (
  <svg width={52} height={52} viewBox="0 0 52 52">
    <circle cx={26} cy={26} r={22} fill={color} {...ICON} />
    <ellipse cx={26} cy={26} rx={9} ry={22} fill="none" {...ICON} strokeWidth={2.5} />
    <path d="M4 26 H48 M8 15 H44 M8 37 H44" fill="none" {...ICON} strokeWidth={2.5} />
  </svg>
);
const BarsIcon = ({ color }) => (
  <svg width={52} height={52} viewBox="0 0 52 52">
    <rect x={6} y={26} width={10} height={20} rx={3} fill={color} {...ICON} />
    <rect x={21} y={12} width={10} height={34} rx={3} fill="#f1f5f9" {...ICON} />
    <rect x={36} y={20} width={10} height={26} rx={3} fill={color} {...ICON} />
  </svg>
);
const LineIcon = ({ color }) => (
  <svg width={52} height={52} viewBox="0 0 52 52">
    <rect x={4} y={6} width={44} height={40} rx={8} fill="#0b1220" stroke={color} strokeWidth={3} />
    <path d="M11 37 L21 27 L28 32 L41 15" stroke={color} strokeWidth={4.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx={41} cy={15} r={4.5} fill="#f1f5f9" />
  </svg>
);
const LensIcon = ({ color }) => (
  <svg width={52} height={52} viewBox="0 0 52 52">
    <path d="M32 32 L45 45" stroke="#06121a" strokeWidth={11} strokeLinecap="round" />
    <path d="M32 32 L45 45" stroke={color} strokeWidth={6} strokeLinecap="round" />
    <circle cx={22} cy={22} r={15} fill="#e0f2fe" {...ICON} />
    <circle cx={22} cy={22} r={15} fill="none" stroke={color} strokeWidth={4} />
    <path d="M13 20 Q15 13 22 12" stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none" />
  </svg>
);

const SKILLS = [
  { name: 'era5-download', text: 'Download ERA5 climate data', color: C.teal, Icon: GlobeIcon },
  { name: 'netcdf-conventions', text: 'Read CF-convention files', color: C.blue, Icon: BarsIcon },
  { name: 'climate-figure-style', text: 'Plot publication-quality figures', color: C.amber, Icon: LineIcon },
  { name: 'code-review', text: 'Review analysis code', color: C.purple, Icon: LensIcon },
];

const CARD_W = 370, CARD_H = 168, GAP = 24, GRID_X = 64, GRID_Y = 150;
const cardPos = (i) => [GRID_X + (i % 2) * (CARD_W + GAP), GRID_Y + Math.floor(i / 2) * (CARD_H + GAP)];

const LX = 1050, LY = 330, LR = 92; // mini agent loop
const D2R = Math.PI / 180;

export const SkillsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Glow hops from card to card, then settles on the one that gets loaded
  const hop = frame >= 100 && frame < 128 ? Math.floor((frame - 100) / 7) % 4 : -1;
  const selected = frame >= 128;

  // Skill chip flies from the first card into the loop
  const t = interpolate(frame, [132, 166], [0, 1], CLAMP);
  const e = t * t * (3 - 2 * t);
  const [c0x, c0y] = cardPos(0);
  const P0 = [c0x + CARD_W / 2, c0y + CARD_H / 2], P1 = [690, 40], P2 = [LX, LY];
  const bx = (1 - e) ** 2 * P0[0] + 2 * (1 - e) * e * P1[0] + e ** 2 * P2[0];
  const by = (1 - e) ** 2 * P0[1] + 2 * (1 - e) * e * P1[1] + e ** 2 * P2[1];
  const chipScale = interpolate(e, [0, 0.15, 0.85, 1], [0.6, 1, 1, 0.35]);
  const chipOp = frame >= 132 && frame < 168 ? interpolate(e, [0, 0.1, 0.9, 1], [0, 1, 1, 0]) : 0;

  const arrow = interpolate(frame, [112, 134], [0, 1], CLAMP);
  const ARROW_X1 = GRID_X + CARD_W * 2 + GAP + 18, ARROW_X2 = LX - LR - 30;
  const absorbed = pop(frame, fps, 166);
  const flash = interpolate(frame, [164, 170, 190], [0, 1, 0], CLAMP);
  const loopIn = pop(frame, fps, 60);

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fo(frame, 190), fontFamily: FONT }}>
      <StepHeader frame={frame} step={4} title="Add skills" color={C.purple} />

      {/* 2 x 2 skill cards */}
      {SKILLS.map((s, i) => {
        const [x, y] = cardPos(i);
        const lit = hop === i || (selected && i === 0) ? 1 : 0;
        return (
          <SpringCard key={s.name} frame={frame} startFrame={10 + i * 25} color={s.color} style={{
            position: 'absolute', left: x, top: y, width: CARD_W, height: CARD_H, boxSizing: 'border-box',
            borderLeft: `7px solid ${s.color}`, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 18,
            background: lit ? `${s.color}30` : `${s.color}18`,
            boxShadow: lit ? `0 0 38px ${s.color}88, 0 6px 0 ${s.color}55` : `0 0 20px ${s.color}1a, 0 6px 0 ${s.color}33`,
            transform: `translateY(${lit ? -5 : 0}px)`,
          }}>
            <div style={{ flexShrink: 0 }}><s.Icon color={s.color} /></div>
            <div>
              <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, color: s.color, whiteSpace: 'nowrap' }}>{s.name}</div>
              <div style={{ fontSize: 18, color: C.soft, marginTop: 6, lineHeight: 1.3 }}>{s.text}</div>
            </div>
          </SpringCard>
        );
      })}

      {/* Arrow from the cards to the agent loop */}
      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
        <line x1={ARROW_X1} y1={LY} x2={ARROW_X1 + (ARROW_X2 - ARROW_X1) * arrow} y2={LY}
          stroke={C.teal} strokeWidth={5} strokeLinecap="round" strokeDasharray="12 10"
          strokeDashoffset={-frame * 1.5} opacity={arrow > 0 ? 1 : 0} />
        {arrow > 0.95 && (
          <path d={`M${ARROW_X2 - 12} ${LY - 11} L${ARROW_X2 + 6} ${LY} L${ARROW_X2 - 12} ${LY + 11} Z`} fill={C.teal} />
        )}

        {/* Mini agent loop */}
        <g transform={`translate(${LX} ${LY}) scale(${Math.max(0, loopIn)})`}>
          <circle r={LR + 26} fill={C.teal} opacity={0.25 * flash} />
          <circle r={LR} fill="#0b1220" stroke="#334155" strokeWidth={5} />
          <circle r={LR} fill="none" stroke={C.teal} strokeWidth={5} strokeDasharray="60 133" strokeLinecap="round"
            transform={`rotate(${frame * 4})`} />
          {[C.teal, C.blue, C.amber].map((col, k) => {
            const a = (k * 120 - 90 + frame * 1.2) * D2R;
            return <circle key={col} cx={LR * Math.cos(a)} cy={LR * Math.sin(a)} r={13} fill={col} stroke="#06121a" strokeWidth={4} />;
          })}
          {/* Robot face */}
          <rect x={-40} y={-34} width={80} height={66} rx={18} fill={C.teal} stroke="#06121a" strokeWidth={4} />
          <rect x={-30} y={-24} width={60} height={38} rx={10} fill="#06121a" />
          <circle cx={-13} cy={-5} r={8} fill="#f1f5f9" />
          <circle cx={13} cy={-5} r={8} fill="#f1f5f9" />
          <path d="M-9 21 Q0 27 9 21" stroke="#06121a" strokeWidth={3.5} fill="none" strokeLinecap="round" />
        </g>
      </svg>

      <div style={{
        position: 'absolute', left: LX - 120, top: LY - LR - 62, width: 240, textAlign: 'center',
        fontSize: 20, fontWeight: 800, color: C.muted, opacity: fi(frame, 66),
      }}>
        Agent loop
      </div>

      {/* The one line that loads the skill */}
      <div style={{
        position: 'absolute', left: LX - 150, top: LY + LR + 34, width: 300, boxSizing: 'border-box', textAlign: 'center',
        transform: `scale(${absorbed})`, opacity: Math.min(1, absorbed),
        background: '#0b1220', border: `2px solid ${C.teal}`, borderRadius: 12, padding: '10px 0',
        fontFamily: MONO, fontSize: 18, boxShadow: `0 5px 0 ${C.teal}55`,
      }}>
        <span style={{ color: '#7dd3fc' }}>skills:</span>
        <span style={{ color: '#fcd34d' }}> era5-download</span>
      </div>

      {/* Flying skill chip */}
      <div style={{
        position: 'absolute', left: bx - 110, top: by - 24, width: 220, height: 48, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${chipScale}) rotate(${(1 - e) * -8}deg)`, opacity: chipOp,
        background: C.teal, color: '#06121a', borderRadius: 24, fontFamily: MONO, fontSize: 18, fontWeight: 700,
        boxShadow: `0 0 30px ${C.teal}aa, 0 5px 0 #0f766e`,
      }}>
        era5-download
      </div>

      <Caption frame={frame} start={96}>
        Skills = reusable instruction bundles — load one with a single line in AGENTS.md
      </Caption>
    </AbsoluteFill>
  );
};
