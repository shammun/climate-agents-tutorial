import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { GlobeBackground } from '../components/GlobeBackground.jsx';
import { TempStack } from '../components/TempStack.jsx';
import { C, FONT, MONO, CLAMP, fi, si, fo, pop, StepHeader } from '../components/SpringCard.jsx';

const STEPS = [
  { n: 1, name: 'Fetch', out: 'ERA5/*.nc', color: C.teal },
  { n: 2, name: 'QC', out: 'qc_*.md', color: C.blue },
  { n: 3, name: 'Analyse', out: '*.nc', color: C.amber },
  { n: 4, name: 'Plot', out: '*.png', color: C.purple },
  { n: 5, name: 'Review', out: 'VERDICT', color: C.rose },
];

const W = 150, H = 116, GAP = 50, X0 = 46, CY = 330;
const stepX = (i) => X0 + i * (W + GAP);          // left edge
const stepCx = (i) => stepX(i) + W / 2;           // centre
const startOf = (i) => 15 + i * 25;

export const PipelineScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Data packet: step 1 → step 5
  const t = interpolate(frame, [180, 240], [0, 1], CLAMP);
  const packetX = interpolate(t, [0, 1], [stepCx(0), stepCx(4)]);
  const packetOn = frame >= 180 && frame <= 246;
  const packetOp = interpolate(frame, [180, 184, 240, 246], [0, 1, 1, 0], CLAMP);
  const packetY = CY - H / 2 - 26 - Math.abs(Math.sin(t * Math.PI * 4)) * 16; // hops over the arrows

  return (
    <AbsoluteFill style={{ opacity: fo(frame, 250), fontFamily: FONT }}>
      <GlobeBackground opacity={0.25} />
      <AbsoluteFill style={{ background: 'rgba(6,9,22,.45)' }} />
      <TempStack x={1078} y={190} />

      <StepHeader frame={frame} step={6} title="Chain the steps into a pipeline" color={C.teal} />

      {/* Connecting arrows */}
      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
        {STEPS.slice(0, 4).map((s, i) => {
          const x1 = stepX(i) + W + 7, x2 = stepX(i + 1) - 9;
          const p = interpolate(frame, [startOf(i) + 12, startOf(i) + 28], [0, 1], CLAMP);
          const xe = x1 + (x2 - x1) * p;
          return (
            <g key={s.n} opacity={p > 0 ? 1 : 0}>
              <line x1={x1} y1={CY} x2={Math.max(x1, xe - 8)} y2={CY} stroke={s.color} strokeWidth={5} strokeLinecap="round" />
              <path d={`M${xe - 12} ${CY - 10} L${xe + 2} ${CY} L${xe - 12} ${CY + 10} Z`} fill={s.color} />
            </g>
          );
        })}

        {/* Travelling data packet */}
        {packetOn && (
          <g transform={`translate(${packetX} ${packetY})`} opacity={packetOp}>
            <circle r={26} fill={C.gold} opacity={0.2} />
            <circle r={16} fill={C.gold} opacity={0.35} />
            <circle r={10} fill="#fef3c7" stroke={C.gold} strokeWidth={4} />
          </g>
        )}
      </svg>

      {STEPS.map((s, i) => {
        const sc = pop(frame, fps, startOf(i));
        // Step lights up when the packet passes over it
        const hit = packetOn ? Math.max(0, 1 - Math.abs(packetX - stepCx(i)) / 70) : 0;
        const outStart = startOf(i) + 14;
        return (
          <div key={s.n}>
            <div style={{
              position: 'absolute', left: stepX(i), top: CY - H / 2, width: W, height: H, boxSizing: 'border-box',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              transform: `scale(${sc * (1 + hit * 0.08)}) translateY(${-hit * 6}px)`, opacity: Math.min(1, sc),
              background: '#0b1220', border: `3px solid ${s.color}`, borderRadius: 20,
              boxShadow: `0 7px 0 ${s.color}55, 0 0 ${22 + hit * 40}px ${s.color}${hit > 0.3 ? 'aa' : '33'}`,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 20, background: s.color, color: '#06121a',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800,
              }}>
                {s.n}
              </div>
              <div style={{ fontSize: 25, fontWeight: 800, color: C.text }}>{s.name}</div>
            </div>

            {/* File output under the step */}
            <div style={{
              position: 'absolute', left: stepX(i) - 10, top: CY + H / 2 + 26, width: W + 20, textAlign: 'center',
              opacity: fi(frame, outStart, 14), transform: `translateY(${si(frame, outStart, 14, -18)}px)`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.muted }}>writes</div>
              <div style={{
                display: 'inline-block', marginTop: 5, fontFamily: MONO, fontSize: 18, fontWeight: 700, color: s.color,
                background: 'rgba(6,9,22,.85)', border: `1.5px solid ${s.color}66`, borderRadius: 9, padding: '5px 12px',
              }}>
                {s.out}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{
        position: 'absolute', left: 46, width: 950, top: 590, textAlign: 'center',
        fontSize: 24, fontWeight: 600, color: C.soft, opacity: fi(frame, 140),
        textShadow: '0 2px 12px rgba(6,9,22,.9)',
      }}>
        Each step writes a file that the next step reads
      </div>
    </AbsoluteFill>
  );
};
