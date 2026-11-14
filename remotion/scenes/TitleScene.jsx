import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { ParticleCanvas } from '../components/ParticleCanvas.jsx';

export const TitleScene = () => {
  const frame = useCurrentFrame();

  const titleOpacity = interpolate(frame, [15, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleY       = interpolate(frame, [15, 45], [40, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const subOpacity   = interpolate(frame, [45, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const bylineOp     = interpolate(frame, [75, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOpacity  = interpolate(frame, [120, 150], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const eyebrowOp    = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: exitOpacity }}>
      <ParticleCanvas />
      {/* Radial glow behind text */}
      <AbsoluteFill style={{
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(13,148,136,.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 80px', textAlign: 'center', gap: 0,
      }}>
        <div style={{
          fontSize: 13, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: '#2dd4bf',
          background: 'rgba(45,212,191,.12)', border: '1px solid rgba(45,212,191,.25)',
          padding: '5px 18px', borderRadius: 50, marginBottom: 28,
          opacity: eyebrowOp,
          boxShadow: '0 0 20px rgba(45,212,191,.2)',
        }}>
          Tutorial · 2026
        </div>
        <h1 style={{
          fontSize: 76, fontWeight: 800, lineHeight: 1.05,
          letterSpacing: '-0.03em', margin: '0 0 20px',
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          background: 'linear-gradient(135deg, #f1f5f9 30%, #2dd4bf 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 32px rgba(45,212,191,.35))',
        }}>
          Building AI Agents<br />for Climate Data
        </h1>
        <p style={{
          fontSize: 24, color: '#94a3b8', maxWidth: 640,
          lineHeight: 1.65, margin: '0 0 32px',
          opacity: subOpacity,
        }}>
          What agents are, how they talk to subagents,<br />
          and a complete climate-analysis template.
        </p>
        <p style={{
          fontSize: 15, color: '#475569', margin: 0,
          opacity: bylineOp,
          fontStyle: 'italic',
        }}>
          By Shammunul Islam · shammun.github.io/climate-agents-tutorial
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
