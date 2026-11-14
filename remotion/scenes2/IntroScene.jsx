import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { GlobeBackground } from '../components/GlobeBackground.jsx';
import { C, FONT, fi, si, fo, pop } from '../components/SpringCard.jsx';

const TITLE = 'Building AI Agents';

/** Scale an SVG group around its own centre */
const about = (cx, cy, s) => `translate(${cx} ${cy}) scale(${Math.max(0, s)}) translate(${-cx} ${-cy})`;

/** Cartoon robot, assembled piece by piece */
const Robot = ({ frame, fps }) => {
  const head = pop(frame, fps, 8);
  const earL = pop(frame, fps, 14);
  const earR = pop(frame, fps, 17);
  const eyeL = pop(frame, fps, 20);
  const eyeR = pop(frame, fps, 24);
  const antenna = pop(frame, fps, 30);
  const mouth = pop(frame, fps, 36);

  const bob = Math.sin(frame / 14) * 5;
  const tilt = Math.sin(frame / 23) * 2.5;
  // Blink for 4 frames roughly every 2.5 seconds
  const blink = frame > 50 && frame % 75 < 4 ? 0.12 : 1;
  const look = Math.sin(frame / 30) * 4;
  const glow = 0.55 + 0.45 * Math.sin(frame / 6);

  return (
    <svg width={260} height={250} viewBox="0 0 260 250" style={{ overflow: 'visible' }}>
      <g transform={`translate(0 ${bob}) rotate(${tilt} 130 150)`}>
        {/* Antenna */}
        <g transform={about(130, 70, antenna)}>
          <rect x={126} y={34} width={8} height={40} rx={4} fill="#0f766e" />
          <circle cx={130} cy={26} r={22} fill={C.gold} opacity={0.25 * glow} />
          <circle cx={130} cy={26} r={13} fill={C.gold} stroke="#06121a" strokeWidth={4} />
          <circle cx={126} cy={22} r={4} fill="#fff" opacity={0.8} />
        </g>

        {/* Ears */}
        <g transform={about(40, 150, earL)}>
          <rect x={22} y={124} width={26} height={52} rx={10} fill="#0f766e" stroke="#06121a" strokeWidth={4} />
        </g>
        <g transform={about(220, 150, earR)}>
          <rect x={212} y={124} width={26} height={52} rx={10} fill="#0f766e" stroke="#06121a" strokeWidth={4} />
        </g>

        {/* Head: a darker offset copy gives the extruded, toy-like depth */}
        <g transform={about(130, 150, head)}>
          <rect x={42} y={82} width={176} height={150} rx={38} fill="#0f766e" stroke="#06121a" strokeWidth={4} />
          <rect x={42} y={70} width={176} height={150} rx={38} fill={C.teal} stroke="#06121a" strokeWidth={4} />
          <rect x={58} y={84} width={144} height={100} rx={26} fill="#06121a" />
          <path d="M62 96 Q66 78 92 78" stroke="#fff" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.55} />
        </g>

        {/* Eyes */}
        <g transform={about(98, 130, eyeL)}>
          <g transform={`translate(98 130) scale(1 ${blink}) translate(-98 -130)`}>
            <circle cx={98} cy={130} r={21} fill="#f1f5f9" />
            <circle cx={98 + look} cy={132} r={10} fill="#06121a" />
            <circle cx={102 + look} cy={127} r={3.5} fill="#fff" />
          </g>
        </g>
        <g transform={about(162, 130, eyeR)}>
          <g transform={`translate(162 130) scale(1 ${blink}) translate(-162 -130)`}>
            <circle cx={162} cy={130} r={21} fill="#f1f5f9" />
            <circle cx={162 + look} cy={132} r={10} fill="#06121a" />
            <circle cx={166 + look} cy={127} r={3.5} fill="#fff" />
          </g>
        </g>

        {/* Smile + cheeks */}
        <g transform={about(130, 168, mouth)}>
          <path d="M112 164 Q130 180 148 164" stroke={C.teal} strokeWidth={5} strokeLinecap="round" fill="none" />
          <circle cx={76} cy={160} r={7} fill={C.rose} opacity={0.75} />
          <circle cx={184} cy={160} r={7} fill={C.rose} opacity={0.75} />
        </g>
      </g>
    </svg>
  );
};

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const typed = Math.max(0, Math.min(TITLE.length, Math.floor((frame - 30) / 2)));
  const typingDone = typed >= TITLE.length;
  const caretOn = !typingDone || Math.floor(frame / 10) % 2 === 0;

  return (
    <AbsoluteFill style={{ opacity: fo(frame, 220), fontFamily: FONT }}>
      <GlobeBackground opacity={0.6} />
      {/* Extra darkening so the robot and title stay readable over the globe */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 55% 70% at 50% 50%, rgba(6,9,22,.72) 0%, rgba(6,9,22,.25) 75%)' }} />

      <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 54 }}>
        <Robot frame={frame} fps={fps} />

        <h1 style={{
          fontSize: 82, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em',
          margin: '26px 0 0', color: C.text, height: 92, whiteSpace: 'pre',
          textShadow: '0 0 36px rgba(45,212,191,.45), 0 4px 0 rgba(6,18,26,.9)',
        }}>
          {TITLE.slice(0, typed)}
          <span style={{
            display: 'inline-block', width: 8, height: 70, marginLeft: 6, verticalAlign: '-8px',
            borderRadius: 3, background: C.teal, opacity: frame >= 26 && caretOn ? 1 : 0,
          }} />
          {/* Untyped remainder keeps its space so the centred title does not shift while typing */}
          <span style={{ opacity: 0 }}>{TITLE.slice(typed)}</span>
        </h1>

        <p style={{
          fontSize: 32, fontWeight: 600, color: C.teal, margin: '18px 0 0',
          opacity: fi(frame, 80), transform: `translateY(${si(frame, 80)}px)`,
        }}>
          A step-by-step guide
        </p>
      </AbsoluteFill>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 52, textAlign: 'center',
        opacity: fi(frame, 110), transform: `translateY(${si(frame, 110, 20, 14)}px)`,
      }}>
        <span style={{
          fontSize: 20, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
          color: C.soft, background: 'rgba(6,9,22,.7)', border: '1.5px solid rgba(45,212,191,.4)',
          padding: '10px 26px', borderRadius: 50,
        }}>
          for Climate Data Analysis
        </span>
      </div>
    </AbsoluteFill>
  );
};
