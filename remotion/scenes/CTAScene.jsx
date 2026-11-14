import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { ParticleCanvas } from '../components/ParticleCanvas.jsx';

const fi = (frame, start, dur = 30) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const BUTTONS = [
  { label: 'Download template (.zip)', primary: true },
  { label: 'View on GitHub', primary: false },
  { label: 'Use this template', primary: false },
];

export const CTAScene = () => {
  const frame = useCurrentFrame();
  const exitOp = interpolate(frame, [100, 120], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: exitOp }}>
      <ParticleCanvas />
      {/* Stronger radial glow for the CTA */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(13,148,136,.22) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 80px', textAlign: 'center', gap: 20,
      }}>
        <div style={{ color: '#2dd4bf', fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', opacity: fi(frame, 5) }}>
          Get started
        </div>

        <h2 style={{
          fontSize: 54, fontWeight: 800, margin: 0,
          lineHeight: 1.08, letterSpacing: '-0.03em',
          background: 'linear-gradient(135deg, #f1f5f9 30%, #2dd4bf 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          opacity: fi(frame, 5),
          filter: 'drop-shadow(0 0 24px rgba(45,212,191,.25))',
        }}>
          Download the template.<br />Start your first analysis.
        </h2>

        <div style={{
          opacity: fi(frame, 20),
          background: 'linear-gradient(135deg, rgba(13,148,136,.2), rgba(8,145,178,.2))',
          border: '1px solid rgba(45,212,191,.3)',
          borderRadius: 12, padding: '14px 28px',
          fontFamily: "'JetBrains Mono', monospace", fontSize: 17, color: '#5eead4',
          letterSpacing: '0.02em',
          boxShadow: '0 0 20px rgba(45,212,191,.12)',
        }}>
          shammun.github.io/climate-agents-tutorial
        </div>

        <div style={{ display: 'flex', gap: 12, opacity: fi(frame, 40) }}>
          {BUTTONS.map(({ label, primary }, i) => (
            <div key={i} style={{
              background: primary
                ? 'linear-gradient(135deg, #0d9488, #0891b2)'
                : 'rgba(255,255,255,.07)',
              border: primary ? 'none' : '1px solid rgba(255,255,255,.18)',
              borderRadius: 50, padding: '11px 24px',
              color: '#f1f5f9', fontWeight: 600, fontSize: 14,
              boxShadow: primary ? '0 4px 24px rgba(13,148,136,.45)' : 'none',
            }}>{label}</div>
          ))}
        </div>

        <div style={{ color: '#334155', fontSize: 13, opacity: fi(frame, 60) }}>
          CC BY 4.0 tutorial text · MIT template code · By Shammunul Islam
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
