/**
 * SpringCard: a reusable card that bounces in with a spring.
 * Also exports the small animation helpers shared by the BuildingAgents scenes.
 */
import { spring, interpolate, useVideoConfig } from 'remotion';

export const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

/** Spring presets from the style guide */
export const BOUNCY = { stiffness: 120, damping: 14, mass: 1 };
export const SNAPPY = { stiffness: 200, damping: 20 };

/** Palette shared by all scenes */
export const C = {
  bg: '#060916',
  teal: '#2dd4bf',
  blue: '#38bdf8',
  amber: '#f59e0b',
  purple: '#a78bfa',
  rose: '#fb7185',
  gold: '#fbbf24',
  green: '#34d399',
  text: '#f1f5f9',
  soft: '#cbd5e1',
  muted: '#94a3b8',
};

export const FONT = "Inter, system-ui, 'Segoe UI', sans-serif";
export const MONO = "'JetBrains Mono', 'Cascadia Code', Consolas, monospace";

/** Fade in: 0 → 1 over `dur` frames starting at `start` */
export const fi = (f, start, dur = 20) => interpolate(f, [start, start + dur], [0, 1], CLAMP);
/** Slide in: `from` px → 0 */
export const si = (f, start, dur = 20, from = 28) => interpolate(f, [start, start + dur], [from, 0], CLAMP);
/** Exit fade: 1 → 0 over 20 frames */
export const fo = (f, exitStart, dur = 20) => interpolate(f, [exitStart, exitStart + dur], [1, 0], CLAMP);
/** Spring value (0 → 1 with overshoot) starting at `start` */
export const pop = (f, fps, start, config = BOUNCY) => spring({ frame: f - start, fps, config });

export const SpringCard = ({ frame, startFrame = 0, color = C.teal, children, style = {} }) => {
  const { fps } = useVideoConfig();
  const sc = spring({ frame: frame - startFrame, fps, config: BOUNCY });
  const { transform: extraTransform, ...rest } = style;
  return (
    <div style={{
      transform: `${extraTransform ? `${extraTransform} ` : ''}scale(${sc})`,
      opacity: Math.max(0, Math.min(1, sc)),
      background: `${color}18`, border: `1.5px solid ${color}44`,
      borderRadius: 14, padding: '14px 18px',
      boxShadow: `0 0 20px ${color}1a`,
      ...rest,
    }}>{children}</div>
  );
};

/** "Step N" pill + scene heading, used at the top of each how-to scene */
export const StepHeader = ({ frame, step, title, color = C.teal, x = 64, y = 40 }) => {
  const { fps } = useVideoConfig();
  const s = pop(frame, fps, 2, SNAPPY);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 14,
      opacity: Math.min(1, s), transform: `translateY(${(1 - s) * -16}px)`, fontFamily: FONT,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase',
        color: '#06121a', background: color, padding: '6px 14px', borderRadius: 50,
        boxShadow: `0 4px 0 ${color}55`,
      }}>
        Step {step}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>{title}</div>
    </div>
  );
};

/** Caption line at the bottom of a scene */
export const Caption = ({ frame, start, children, y = 640 }) => (
  <div style={{
    position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center',
    fontFamily: FONT, fontSize: 24, fontWeight: 600, color: C.soft,
    opacity: fi(frame, start), transform: `translateY(${si(frame, start, 20, 16)}px)`,
  }}>{children}</div>
);
