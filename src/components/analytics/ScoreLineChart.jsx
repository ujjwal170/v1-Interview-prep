/**
 * ScoreLineChart — renders a simple line chart of session scores over time.
 *
 * Props:
 *   data  {Array<{ date: string, score: number }>}  – oldest-first score history
 *
 * Requirements: 12.2
 *
 * Uses a plain SVG-based chart to avoid adding a charting library dependency.
 */
export default function ScoreLineChart({ data = [] }) {
  if (data.length < 2) {
    return null;
  }

  const WIDTH = 600;
  const HEIGHT = 200;
  const PADDING = { top: 20, right: 20, bottom: 40, left: 40 };

  const chartW = WIDTH - PADDING.left - PADDING.right;
  const chartH = HEIGHT - PADDING.top - PADDING.bottom;

  const maxScore = 10;
  const minScore = 0;

  // Map data points to SVG coordinates
  const points = data.map((d, i) => {
    const x = PADDING.left + (i / (data.length - 1)) * chartW;
    const y = PADDING.top + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH;
    return { x, y, ...d };
  });

  // Build polyline points string
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Y-axis tick values
  const yTicks = [0, 2, 4, 6, 8, 10];

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full max-w-full"
        role="img"
        aria-label="Session score history line chart"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => {
          const y = PADDING.top + chartH - ((tick - minScore) / (maxScore - minScore)) * chartH;
          return (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + chartW}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text)"
          >
            {p.date}
          </text>
        ))}

        {/* Line */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data point dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="var(--accent)"
            stroke="var(--bg)"
            strokeWidth="2"
          >
            <title>{`Session ${i + 1}: ${p.score.toFixed(1)}`}</title>
          </circle>
        ))}

        {/* Axes */}
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={PADDING.top + chartH}
          stroke="var(--border)"
          strokeWidth="1.5"
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top + chartH}
          x2={PADDING.left + chartW}
          y2={PADDING.top + chartH}
          stroke="var(--border)"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
