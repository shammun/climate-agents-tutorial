import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { GlobeBackground } from '../components/GlobeBackground.jsx';
import { TempStack } from '../components/TempStack.jsx';
import { C, FONT, MONO, fi, si, pop, SNAPPY } from '../components/SpringCard.jsx';

const BUTTONS = [
  { label: 'Download template', primary: true },
  { label: 'Read the tutorial', primary: false },
  { label: 'Use on GitHub', primary: false },
];

// No exit fade: the last frame holds.
export const CTA2Scene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const title = pop(frame, fps, 14, SNAPPY);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, opacity: fi(frame, 0, 12) }}>
      <GlobeBackground opacity={0.6} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 55% 70% at 50% 50%, rgba(6,9,22,.7) 0%, rgba(6,9,22,.2) 75%)' }} />
      <TempStack x={1070} y={180} />

      <AbsoluteFill style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 80px', textAlign: 'center',
      }}>
        <div style={{
          color: C.teal, fontSize: 16, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase',
          opacity: fi(frame, 6), marginBottom: 14,
        }}>
          Six steps, one template
        </div>

        <h2 style={{
          fontSize: 84, fontWeight: 800, margin: 0, lineHeight: 1.08, letterSpacing: '-0.03em', color: C.text,
          transform: `scale(${0.8 + 0.2 * title})`, opacity: Math.min(1, title),
          textShadow: '0 0 36px rgba(45,212,191,.45), 0 4px 0 rgba(6,18,26,.9)',
        }}>
          Get started today
        </h2>

        <div style={{ display: 'flex', gap: 18, marginTop: 44 }}>
          {BUTTONS.map(({ label, primary }, i) => {
            const s = pop(frame, fps, 40 + i * 12);
            return (
              <div key={label} style={{
                transform: `scale(${s})`, opacity: Math.min(1, s),
                background: primary ? C.teal : 'rgba(6,9,22,.75)',
                border: `2.5px solid ${primary ? C.teal : 'rgba(241,245,249,.55)'}`,
                borderRadius: 50, padding: '15px 32px',
                color: primary ? '#06121a' : C.text, fontWeight: 800, fontSize: 22,
                boxShadow: primary ? '0 6px 0 #0f766e, 0 0 34px rgba(45,212,191,.5)' : '0 6px 0 rgba(148,163,184,.35)',
              }}>
                {label}
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 46, opacity: fi(frame, 84), transform: `translateY(${si(frame, 84, 20, 16)}px)`,
          background: 'rgba(6,9,22,.8)', border: '1.5px solid rgba(45,212,191,.45)', borderRadius: 12,
          padding: '13px 30px', fontFamily: MONO, fontSize: 22, color: '#5eead4', letterSpacing: '0.02em',
        }}>
          shammun.github.io/climate-agents-tutorial
        </div>

        <div style={{ marginTop: 20, color: C.soft, fontSize: 18, opacity: fi(frame, 100) }}>
          By Shammunul Islam · CC BY 4.0 tutorial text · MIT template code
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
