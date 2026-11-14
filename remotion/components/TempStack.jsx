/**
 * TempStack: illustrative vertical stack of atmosphere pressure levels with
 * temperature color gradient and wind speed indicator bars — visual language
 * from AOFD stack3d.tsx but as a pure React/SVG component with no data deps.
 */
import { useCurrentFrame, interpolate } from 'remotion';

const LEVELS = [
  { p: '125 hPa', z: 'Stratosphere',   t: -56, wind: 55, color: '#8b5cf6', yFrac: 0.00 },
  { p: '200 hPa', z: '~12 km',         t: -47, wind: 42, color: '#3b82f6', yFrac: 0.20 },
  { p: '500 hPa', z: '~5.5 km',        t: -18, wind: 22, color: '#06b6d4', yFrac: 0.42 },
  { p: '850 hPa', z: '~1.5 km',        t:   8, wind: 12, color: '#10b981', yFrac: 0.65 },
  { p: '975 hPa', z: 'Near surface',   t:  22, wind:  6, color: '#f59e0b', yFrac: 0.85 },
];

const W = 170, H = 310, PAD = 14, BARW = 90, LBL = 46;
const fi = (frame, start, dur = 20) =>
  interpolate(frame, [start, start + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const TempStack = ({ x = 1070, y = 90, opacity = 1 }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: W, opacity: opacity * fi(frame, 10),
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Panel header */}
      <div style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
        color: '#64748b', marginBottom: 6,
      }}>
        Atmospheric layers
      </div>

      {/* Layers */}
      {LEVELS.map((lv, i) => {
        const layerOpacity = fi(frame, 20 + i * 15);
        const windW = Math.round((lv.wind / 60) * BARW);
        return (
          <div key={lv.p} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            marginBottom: 5, opacity: layerOpacity,
          }}>
            {/* Color swatch */}
            <div style={{
              width: 10, height: 36, borderRadius: 3, flexShrink: 0,
              background: lv.color,
              boxShadow: `0 0 8px ${lv.color}88`,
            }} />

            {/* Info panel */}
            <div style={{
              flex: 1,
              background: `${lv.color}12`,
              border: `1px solid ${lv.color}30`,
              borderRadius: 6, padding: '4px 7px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ color: lv.color, fontSize: 10, fontWeight: 700 }}>{lv.p}</span>
                <span style={{ color: '#94a3b8', fontSize: 9 }}>{lv.t > 0 ? '+' : ''}{lv.t}°C</span>
              </div>
              <div style={{ color: '#475569', fontSize: 9, marginTop: 1 }}>{lv.z}</div>
              {/* Wind bar */}
              <div style={{ marginTop: 4, height: 3, background: 'rgba(255,255,255,.07)', borderRadius: 2 }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: windW,
                  background: `linear-gradient(90deg, ${lv.color}99, ${lv.color})`,
                  transition: 'width 0s',
                }} />
              </div>
              <div style={{ color: '#334155', fontSize: 8, marginTop: 1 }}>
                {lv.wind} m/s wind
              </div>
            </div>
          </div>
        );
      })}

      {/* Altitude bar on the left side */}
      <svg
        style={{ position: 'absolute', left: -18, top: 20, pointerEvents: 'none' }}
        width={12} height={280}
      >
        <defs>
          <linearGradient id="altGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect x={4} y={0} width={4} height={280} rx={2} fill="url(#altGrad)" opacity={0.4} />
        <text x={1} y={8}  fontSize={7} fill="#8b5cf6" opacity={0.8}>↑</text>
        <text x={1} y={275} fontSize={7} fill="#f59e0b" opacity={0.8}>↓</text>
      </svg>
    </div>
  );
};
