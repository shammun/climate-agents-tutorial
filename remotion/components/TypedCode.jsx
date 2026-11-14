/**
 * TypedCode: shows `code` with characters revealed at `charsPerFrame` per frame,
 * line by line, with an optional pause between lines.
 * Lines starting with `#` are comments; `key: value` lines get YAML-style colours.
 * Completed lines get a subtle highlight; the line being typed gets a caret.
 */
const COLORS = {
  comment: '#2dd4bf',
  key: '#7dd3fc',
  value: '#fcd34d',
  plain: '#e2e8f0',
  dash: '#fb7185',
};

/**
 * Typing schedule: for each line, the frame it starts and ends on.
 * Exported so a scene can follow the typing position (for a cursor, callouts, …).
 */
export const typingSchedule = (code, startFrame = 0, charsPerFrame = 3, linePause = 0) => {
  let t = startFrame;
  return code.split('\n').map((text) => {
    const start = t;
    const end = start + Math.max(1, Math.ceil(text.length / charsPerFrame));
    t = end + linePause;
    return { text, start, end };
  });
};

/** Index of the line being typed at `frame` (the last line once everything is typed) */
export const currentLine = (schedule, frame) => {
  let idx = 0;
  schedule.forEach((l, i) => { if (frame >= l.start) idx = i; });
  return idx;
};

const renderLine = (shown) => {
  if (shown.startsWith('#')) return <span style={{ color: COLORS.comment }}>{shown}</span>;
  const dash = shown.match(/^(\s*)- (.*)$/);
  if (dash) {
    return (
      <>
        {dash[1]}<span style={{ color: COLORS.dash }}>- </span>
        <span style={{ color: COLORS.plain }}>{dash[2]}</span>
      </>
    );
  }
  const kv = shown.match(/^([A-Za-z_][\w-]*:)(.*)$/);
  if (kv) {
    return (
      <>
        <span style={{ color: COLORS.key }}>{kv[1]}</span>
        <span style={{ color: COLORS.value }}>{kv[2]}</span>
      </>
    );
  }
  return <span style={{ color: COLORS.plain }}>{shown}</span>;
};

export const TypedCode = ({
  code, frame, startFrame = 0, charsPerFrame = 3, linePause = 0,
  fontSize = 15, lineHeight = 26, lineNumbers = false, style = {},
}) => {
  const schedule = typingSchedule(code, startFrame, charsPerFrame, linePause);
  const active = currentLine(schedule, frame);
  const allDone = frame >= schedule[schedule.length - 1].end;
  const caretOn = Math.floor(frame / 8) % 2 === 0;

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
      fontSize, padding: 20, whiteSpace: 'pre', ...style,
    }}>
      {schedule.map((l, i) => {
        if (frame < l.start) return <div key={i} style={{ height: lineHeight }} />;
        const n = Math.min(l.text.length, Math.floor((frame - l.start) * charsPerFrame));
        const done = frame >= l.end;
        const sinceDone = frame - l.end;
        // Highlight flashes when the line completes, then settles to a subtle tint
        const flash = done ? Math.max(0.05, 0.22 - sinceDone * 0.012) : 0;
        return (
          <div key={i} style={{
            height: lineHeight, lineHeight: `${lineHeight}px`, display: 'flex',
            background: done ? `rgba(45,212,191,${flash})` : 'rgba(255,255,255,.05)',
            borderRadius: 5, margin: '0 -8px', padding: '0 8px',
          }}>
            {lineNumbers && (
              <span style={{ width: 34, color: '#475569', flexShrink: 0, userSelect: 'none' }}>{i + 1}</span>
            )}
            <span>{renderLine(l.text.slice(0, n))}</span>
            {i === active && (!allDone || caretOn) && (
              <span style={{
                width: Math.round(fontSize * 0.55), height: Math.round(lineHeight * 0.72),
                marginTop: Math.round(lineHeight * 0.14), marginLeft: 1,
                background: '#2dd4bf', opacity: allDone ? 0.8 : 1, borderRadius: 2,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};
