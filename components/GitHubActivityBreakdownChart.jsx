import React from 'react';
import { computeActivityBreakdown } from '#utils/githubActivity.js';

// Four cardinal axes around a shared center — top/right/bottom/left map
// directly to standard SVG angle math (0° = right, 90° = down, since SVG's
// y-axis points downward), so these four angles alone place every axis
// exactly where the spec calls for it without a general N-axis system this
// chart doesn't need.
const CX = 110;
const CY = 110;
const MAX_RADIUS = 70;

const AXES = [
  { key: 'codeReviews', label: 'Code reviews', angle: -90 },
  { key: 'issues', label: 'Issues', angle: 0 },
  { key: 'pullRequests', label: 'Pull requests', angle: 90 },
  { key: 'commits', label: 'Commits', angle: 180 },
];

function polarPoint(radius, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

// Renders the four-axis "commits / pull requests / issues / code reviews"
// shape from real classified-activity counts. Each axis's distance from
// center is that category's share of `classifiedTotal` — never a share of
// the calendar's overall `totalContributions`, which can include
// contribution categories (e.g. repository creation) these four axes don't
// represent at all. The SVG is decorative (aria-hidden): the text list
// below it is the actual accessible data source, not a duplicate of it.
const GitHubActivityBreakdownChart = ({ activity }) => {
  const breakdown = computeActivityBreakdown(activity);
  const hasData = breakdown.classifiedTotal > 0;

  const dataPoints = AXES.map((axis) => {
    const pct = breakdown.percentages[axis.key];
    const radius = hasData ? (pct / 100) * MAX_RADIUS : 0;
    return { ...axis, pct, point: polarPoint(radius, axis.angle) };
  });
  const polygonPoints = dataPoints.map((d) => `${d.point.x},${d.point.y}`).join(' ');

  return (
    <div className="github-activity-chart">
      <svg viewBox="0 0 220 220" aria-hidden="true" className="github-activity-chart__svg">
        {[0.5, 1].map((fraction) => (
          <polygon
            key={fraction}
            points={AXES.map((axis) => {
              const p = polarPoint(MAX_RADIUS * fraction, axis.angle);
              return `${p.x},${p.y}`;
            }).join(' ')}
            className="github-activity-chart__ring"
          />
        ))}

        {AXES.map((axis) => {
          const end = polarPoint(MAX_RADIUS, axis.angle);
          const labelPos = polarPoint(MAX_RADIUS + 24, axis.angle);
          return (
            <g key={axis.key}>
              <line x1={CX} y1={CY} x2={end.x} y2={end.y} className="github-activity-chart__axis" />
              <text x={labelPos.x} y={labelPos.y} textAnchor="middle" dominantBaseline="middle" className="github-activity-chart__axis-label">
                {axis.label}
              </text>
            </g>
          );
        })}

        {hasData ? (
          <>
            <polygon points={polygonPoints} className="github-activity-chart__polygon" />
            {dataPoints.map((d) => (
              <circle key={d.key} cx={d.point.x} cy={d.point.y} r={3.5} className="github-activity-chart__point" />
            ))}
          </>
        ) : null}
      </svg>

      {hasData ? (
        <ul className="github-activity-chart__summary">
          {dataPoints.map((d) => (
            <li key={d.key}>
              <span className="github-activity-chart__summary-label">{d.label}</span>
              <span className="github-activity-chart__summary-value">
                {breakdown[d.key]} — {Math.round(d.pct)}%
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="github-activity-chart__empty">No classified activity is available for this period.</p>
      )}
    </div>
  );
};

export default GitHubActivityBreakdownChart;
