import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { GlobeBackground } from '../components/GlobeBackground.jsx';

const fi = (frame, start, dur = 20) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const si = (frame, start, dur = 20, from = 24) =>
  interpolate(frame, [start, start + dur], [from, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const STEPS = [
  { n: 1, name: 'data-fetcher',     desc: 'download ERA5 data',    out: 'data/raw/era5/*.nc',      color: '#38bdf8', badge: null },
  { n: 2, name: 'data-qc',          desc: 'check data quality',    out: 'reports/qc_*.md',         color: '#f59e0b', badge: 'read-only' },
  { n: 3, name: 'climate-analyst',  desc: 'JJA mean, trend',       out: 'data/processed/*.nc',     color: '#a78bfa', badge: null },
  { n: 4, name: 'figure-maker',     desc: 'map + time series',     out: 'figures/*.png',           color: '#2dd4bf', badge: null },
  { n: 5, name: 'results-reviewer', desc: 'independent check',     out: 'VERDICT: READY',          color: '#fb7185', badge: 'read-only' },
];

const lineH = interpolate;

export const PipelineScene = () => {
  const frame = useCurrentFrame();
  const exitOp = interpolate(frame, [185, 210], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Vertical connector line height grows from step 1 to step 5
  const lineProgress = interpolate(frame, [20, 160], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: exitOp }}>
      <GlobeBackground opacity={0.35} />
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '24px 72px', gap: 0,
      }}>
        <div style={{ color: '#2dd4bf', fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16, opacity: fi(frame, 0) }}>
          The five-step climate pipeline
        </div>

        <div style={{ position: 'relative', width: '100%', maxWidth: 720 }}>
          {/* Vertical connector line */}
          <div style={{
            position: 'absolute', left: 19, top: 20,
            width: 2, height: `${lineProgress * 100}%`,
            background: 'linear-gradient(180deg, #2dd4bf, #0891b2)',
            boxShadow: '0 0 8px rgba(45,212,191,.4)',
            transition: 'none',
          }} />

          {STEPS.map((step, i) => (
            <div key={step.n} style={{
              display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10,
              opacity: fi(frame, 20 + i * 28),
              transform: `translateX(${interpolate(frame, [20 + i * 28, 40 + i * 28], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
            }}>
              {/* Number circle */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${step.color}, ${step.color}99)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 15, color: '#060d1f',
                boxShadow: `0 0 16px ${step.color}44`,
                zIndex: 1,
              }}>{step.n}</div>

              {/* Step card */}
              <div style={{
                flex: 1,
                background: `linear-gradient(135deg, ${step.color}18, ${step.color}0a)`,
                border: `1.5px solid ${step.color}44`,
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: `0 0 14px ${step.color}12`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ color: step.color, fontWeight: 700, fontSize: 14 }}>{step.name}</span>
                    {step.badge && (
                      <span style={{
                        background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.3)',
                        borderRadius: 50, padding: '1px 7px', fontSize: 9.5, color: '#fb7185', fontWeight: 700,
                      }}>{step.badge}</span>
                    )}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 12.5 }}>{step.desc}</div>
                </div>
                {/* Output pill */}
                <div style={{
                  background: 'rgba(13,148,136,.1)', border: '1px solid rgba(45,212,191,.2)',
                  borderRadius: 6, padding: '4px 10px',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#5eead4',
                  whiteSpace: 'nowrap',
                }}>{step.out}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ color: '#475569', fontSize: 13, marginTop: 10, textAlign: 'center', opacity: fi(frame, 155) }}>
          Each step writes files the next step reads.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
