import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { C, FONT, MONO, CLAMP, fi, si, fo, pop, StepHeader } from '../components/SpringCard.jsx';

const ROW_H = 66, TOP = 128, LEFT = 110, INDENT = 46;

// parent = index of the parent row (for the connector elbow)
const ROWS = [
  { name: 'my-climate-agent/', kind: 'folder', depth: 0, start: 10 },
  { name: 'CLAUDE.md', kind: 'file', depth: 1, parent: 0, start: 30, role: 'Project instructions', color: C.teal },
  { name: 'AGENTS.md', kind: 'file', depth: 1, parent: 0, start: 50, role: 'Agent definitions', color: C.blue },
  { name: '.claude/', kind: 'folder', depth: 1, parent: 0, start: 70 },
  { name: 'agents/', kind: 'folder', depth: 2, parent: 3, start: 90, role: 'One file per subagent', color: C.purple },
  { name: 'climate-analyst.md', kind: 'file', depth: 3, parent: 4, start: 110, role: 'A subagent', color: C.rose },
  { name: 'climate_agent.py', kind: 'file', depth: 1, parent: 0, start: 130, role: 'Python entry point', color: C.amber },
];

const rowY = (i) => TOP + i * ROW_H + ROW_H / 2;
const rowX = (depth) => LEFT + depth * INDENT;

const FolderIcon = ({ color = C.gold }) => (
  <svg width={44} height={38} viewBox="0 0 44 38">
    <path d="M3 8 Q3 4 7 4 H17 L21 9 H37 Q41 9 41 13 V30 Q41 34 37 34 H7 Q3 34 3 30 Z" fill="#b45309" stroke="#06121a" strokeWidth={3} strokeLinejoin="round" />
    <path d="M3 16 Q3 13 6 13 H38 Q41 13 41 16 V30 Q41 34 37 34 H7 Q3 34 3 30 Z" fill={color} stroke="#06121a" strokeWidth={3} strokeLinejoin="round" />
    <path d="M9 19 H20" stroke="#fff" strokeWidth={3} strokeLinecap="round" opacity={0.6} />
  </svg>
);

const FileIcon = ({ color }) => (
  <svg width={34} height={40} viewBox="0 0 34 40">
    <path d="M4 6 Q4 3 7 3 H21 L30 12 V34 Q30 37 27 37 H7 Q4 37 4 34 Z" fill="#f1f5f9" stroke="#06121a" strokeWidth={3} strokeLinejoin="round" />
    <path d="M21 3 V12 H30 Z" fill={color} stroke="#06121a" strokeWidth={3} strokeLinejoin="round" />
    <path d="M10 19 H24 M10 25 H24 M10 31 H19" stroke={color} strokeWidth={3} strokeLinecap="round" />
  </svg>
);

export const FilesScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glow = fi(frame, 150, 20) * (0.65 + 0.35 * Math.sin(frame / 6));
  const LABEL_X = 700;

  return (
    <AbsoluteFill style={{ background: C.bg, opacity: fo(frame, 220), fontFamily: FONT }}>
      <StepHeader frame={frame} step={2} title="Create the project files" color={C.blue} />

      {/* Teal glow around the .claude/agents/ subtree */}
      <div style={{
        position: 'absolute', left: rowX(1) - 16, top: rowY(3) - ROW_H / 2 + 3,
        width: 1090 - rowX(1), height: ROW_H * 3 - 6, borderRadius: 18,
        border: `2px solid rgba(45,212,191,${0.75 * glow})`,
        background: `rgba(45,212,191,${0.07 * glow})`,
        boxShadow: `0 0 ${36 * glow}px rgba(45,212,191,${0.55 * glow}), inset 0 0 ${24 * glow}px rgba(45,212,191,${0.18 * glow})`,
      }} />

      {/* Connector elbows */}
      <svg width={1280} height={720} style={{ position: 'absolute', inset: 0 }}>
        {ROWS.map((r, i) => {
          if (r.parent === undefined) return null;
          const x = rowX(r.depth - 1) + 21;
          const y1 = rowY(r.parent) + 22, y2 = rowY(i), x2 = rowX(r.depth) - 6;
          const len = (y2 - y1) + (x2 - x);
          const p = interpolate(frame, [r.start - 6, r.start + 10], [0, 1], CLAMP);
          return (
            <path key={i} d={`M${x} ${y1} V${y2 - 10} Q${x} ${y2} ${x + 10} ${y2} H${x2}`} fill="none"
              stroke="#475569" strokeWidth={3} strokeLinecap="round"
              strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
          );
        })}
      </svg>

      {ROWS.map((r, i) => {
        const y = rowY(i), x = rowX(r.depth);
        const isFolder = r.kind === 'folder';
        // Root folder bounces in; everything else slides in from the left
        const s = i === 0 ? pop(frame, fps, r.start) : 1;
        const op = i === 0 ? Math.min(1, s) : fi(frame, r.start, 14);
        const dx = i === 0 ? 0 : si(frame, r.start, 16, -44);
        const wipe = r.role ? interpolate(frame, [r.start + 12, r.start + 30], [0, 1], CLAMP) : 0;
        const labelIn = r.role ? pop(frame, fps, r.start + 24) : 0;
        return (
          <div key={r.name}>
            {/* Highlight wipe that leads to the role label */}
            {r.role && (
              <div style={{
                position: 'absolute', left: x - 8, top: y - 25, height: 50, borderRadius: 12,
                width: (LABEL_X - x + 8) * wipe,
                background: `linear-gradient(90deg, ${r.color}2e, ${r.color}0d)`,
                borderLeft: `4px solid ${r.color}`, opacity: wipe > 0 ? 1 : 0,
              }} />
            )}

            <div style={{
              position: 'absolute', left: x, top: y - 22, height: 44, display: 'flex', alignItems: 'center', gap: 14,
              opacity: op, transform: `translateX(${dx}px) scale(${s})`, transformOrigin: 'left center',
            }}>
              <div style={{ width: 44, display: 'flex', justifyContent: 'center' }}>
                {isFolder ? <FolderIcon color={i >= 3 ? C.teal : C.gold} /> : <FileIcon color={r.color} />}
              </div>
              <span style={{
                fontFamily: MONO, fontSize: i === 0 ? 30 : 26, fontWeight: isFolder ? 700 : 500,
                color: isFolder ? C.text : C.soft,
              }}>
                {r.name}
              </span>
            </div>

            {r.role && (
              <div style={{
                position: 'absolute', left: LABEL_X + 14, top: y - 22, height: 44, boxSizing: 'border-box',
                display: 'flex', alignItems: 'center', padding: '0 20px', borderRadius: 22,
                background: r.color, color: '#06121a', fontSize: 21, fontWeight: 800, whiteSpace: 'nowrap',
                transform: `scale(${labelIn})`, transformOrigin: 'left center', opacity: Math.min(1, labelIn),
                boxShadow: `0 5px 0 ${r.color}55`,
              }}>
                {r.role}
              </div>
            )}
          </div>
        );
      })}

      <div style={{
        position: 'absolute', left: 0, right: 0, top: 648, textAlign: 'center',
        fontSize: 24, fontWeight: 600, color: C.soft, opacity: fi(frame, 160),
      }}>
        Plain text files tell the agent who it is and what to do
      </div>
    </AbsoluteFill>
  );
};
