import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { ParticleCanvas } from '../components/ParticleCanvas.jsx';

const fi = (frame, start, dur = 20) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
const si = (frame, start, dur = 20, from = 28) =>
  interpolate(frame, [start, start + dur], [from, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

const Box = ({ children, frame, startFrame, color = '#0d9488', style = {} }) => (
  <div style={{
    opacity: fi(frame, startFrame),
    transform: `translateY(${si(frame, startFrame)}px)`,
    background: `linear-gradient(135deg, ${color}1e, ${color}0d)`,
    border: `1.5px solid ${color}66`,
    borderRadius: 14, padding: '14px 22px',
    boxShadow: `0 0 24px ${color}1a, inset 0 1px 0 ${color}22`,
    ...style,
  }}>{children}</div>
);

const Pill = ({ children, frame, startFrame, color }) => (
  <Box frame={frame} startFrame={startFrame} color={color}
    style={{ padding: '10px 36px', borderRadius: 50, alignSelf: 'center' }}>
    <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 18 }}>{children}</span>
  </Box>
);

const GlowArrow = ({ frame, startFrame, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: fi(frame, startFrame), gap: 2 }}>
    {label && <div style={{ color: '#64748b', fontSize: 12, letterSpacing: '.03em' }}>{label}</div>}
    <div style={{ color: '#2dd4bf', fontSize: 22, lineHeight: 1, filter: 'drop-shadow(0 0 6px #2dd4bf)' }}>↓</div>
  </div>
);

export const AgentLoopScene = () => {
  const frame = useCurrentFrame();
  const exitOp = interpolate(frame, [390, 420], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity: exitOp }}>
      <ParticleCanvas />
      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '32px 100px', gap: 8,
      }}>
        <div style={{ color: '#2dd4bf', fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 16, opacity: fi(frame, 0) }}>
          How an agent works
        </div>

        <Pill frame={frame} startFrame={8} color="#38bdf8">Task</Pill>
        <GlowArrow frame={frame} startFrame={28} />

        <Box frame={frame} startFrame={40} color="#0d9488" style={{ width: 420, textAlign: 'center' }}>
          <div style={{ color: '#2dd4bf', fontWeight: 800, fontSize: 21, marginBottom: 8, letterSpacing: '-.01em' }}>Model (LLM)</div>
          <div style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.65 }}>
            reads: instructions + task<br />
            + every tool result so far<br />
            decides the next step
          </div>
        </Box>

        {/* Fork */}
        <div style={{ display: 'flex', gap: 56, alignItems: 'flex-start', width: 540, marginTop: 4 }}>
          {/* Done branch */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 6 }}>
            <GlowArrow frame={frame} startFrame={78} label="done" />
            <Box frame={frame} startFrame={98} color="#f59e0b" style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ color: '#fde68a', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Final answer</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>returned to the caller</div>
            </Box>
          </div>

          {/* Tool branch */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 6 }}>
            <GlowArrow frame={frame} startFrame={78} label="asks for a tool" />
            <Box frame={frame} startFrame={98} color="#38bdf8" style={{ textAlign: 'center', width: '100%' }}>
              <div style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Loop runs the tool</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>read file · run script<br />search · download</div>
            </Box>
            <div style={{
              opacity: fi(frame, 125), fontSize: 12, color: '#2dd4bf',
              fontStyle: 'italic', textAlign: 'center',
              filter: 'drop-shadow(0 0 5px rgba(45,212,191,.5))',
            }}>↺ result loops back to Model</div>
          </div>
        </div>

        <div style={{ color: '#475569', fontSize: 14, marginTop: 20, textAlign: 'center', opacity: fi(frame, 155) }}>
          The loop repeats until the model gives a final answer.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
