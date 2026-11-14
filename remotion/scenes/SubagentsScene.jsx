import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { ParticleCanvas } from '../components/ParticleCanvas.jsx';

const fi = (frame, start, dur = 20) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const si = (frame, start, dur = 20, from = 28) =>
  interpolate(frame, [start, start + dur], [from, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const AGENTS = [
  { name: 'data-fetcher',     role: 'downloads ERA5 data',   color: '#38bdf8', badge: null },
  { name: 'data-qc',          role: 'checks · read-only',    color: '#f59e0b', badge: 'read-only' },
  { name: 'climate-analyst',  role: 'computes stats + trends', color: '#a78bfa', badge: null },
  { name: 'results-reviewer', role: 'reviews · read-only',   color: '#fb7185', badge: 'read-only' },
];

export const SubagentsScene = () => {
  const frame = useCurrentFrame();
  const exitOp = interpolate(frame, [330, 360], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: exitOp }}>
      <ParticleCanvas />
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 80px', gap: 10,
      }}>
        <div style={{ color: '#2dd4bf', fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12, opacity: fi(frame, 0) }}>
          Agents and subagents
        </div>

        {/* You pill */}
        <div style={{
          opacity: fi(frame, 10),
          transform: `translateY(${si(frame, 10)}px)`,
          background: 'rgba(241,245,249,.1)', border: '1.5px solid rgba(241,245,249,.25)',
          borderRadius: 50, padding: '8px 32px',
          color: '#f1f5f9', fontWeight: 700, fontSize: 17,
        }}>You</div>

        {/* Arrow down */}
        <div style={{ color: '#2dd4bf', fontSize: 20, opacity: fi(frame, 28), filter: 'drop-shadow(0 0 5px #2dd4bf)' }}>↓</div>

        {/* Main agent */}
        <div style={{
          opacity: fi(frame, 38), transform: `translateY(${si(frame, 38)}px)`,
          background: 'linear-gradient(135deg, rgba(13,148,136,.22), rgba(8,145,178,.14))',
          border: '2px solid rgba(45,212,191,.5)',
          borderRadius: 16, padding: '16px 32px', textAlign: 'center', width: 380,
          boxShadow: '0 0 32px rgba(45,212,191,.2), inset 0 1px 0 rgba(45,212,191,.15)',
        }}>
          <div style={{ color: '#2dd4bf', fontWeight: 800, fontSize: 19, marginBottom: 4 }}>Main agent</div>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>talks to you, plans, delegates</div>
        </div>

        {/* Delegation label */}
        <div style={{ color: '#475569', fontSize: 12, opacity: fi(frame, 60), letterSpacing: '.03em' }}>
          task + file paths →
        </div>

        {/* 4 subagents in 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: 580, marginTop: 4 }}>
          {AGENTS.map((ag, i) => (
            <div key={ag.name} style={{
              opacity: fi(frame, 70 + i * 22),
              transform: `translateY(${si(frame, 70 + i * 22)}px)`,
              background: `linear-gradient(135deg, ${ag.color}18, ${ag.color}0a)`,
              border: `1.5px solid ${ag.color}50`,
              borderRadius: 12, padding: '12px 16px',
              boxShadow: `0 0 16px ${ag.color}14`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ color: ag.color, fontWeight: 700, fontSize: 14 }}>{ag.name}</div>
                {ag.badge && (
                  <div style={{
                    background: 'rgba(251,113,133,.12)', border: '1px solid rgba(251,113,133,.3)',
                    borderRadius: 50, padding: '1px 8px', fontSize: 10, color: '#fb7185', fontWeight: 600,
                  }}>{ag.badge}</div>
                )}
              </div>
              <div style={{ color: '#64748b', fontSize: 12.5 }}>{ag.role}</div>
              <div style={{ color: '#334155', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>own context · own tools</div>
            </div>
          ))}
        </div>

        <div style={{ color: '#475569', fontSize: 13, marginTop: 16, textAlign: 'center', opacity: fi(frame, 180) }}>
          Each subagent starts with an empty context and returns only a short summary.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
