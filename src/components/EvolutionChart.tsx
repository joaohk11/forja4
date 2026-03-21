import { useMemo } from 'react';
import type { EvalTest, EvalResult } from '@/lib/types';
import {
  PHYSICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
} from '@/lib/types';

interface DataPoint {
  date: string;
  score: number;
}

export type ChartAttribute = string; // attribute key or '_fisico'

const ALL_ATTRS = [...PHYSICAL_ATTRIBUTES, ...TECHNICAL_ATTRIBUTES] as string[];

function getLabel(attr: ChartAttribute): string {
  if (attr === '_fisico') return 'Físico (média)';
  return (PHYSICAL_ATTRIBUTE_LABELS as any)[attr] || (TECHNICAL_ATTRIBUTE_LABELS as any)[attr] || attr;
}

function getAttrColor(attr: ChartAttribute, secondary = false): string {
  if (secondary) return '#f59e0b';
  return 'hsl(var(--primary))';
}

function computeSeries(
  athleteId: string,
  attr: ChartAttribute,
  evalTests: EvalTest[],
  evalResults: EvalResult[],
): DataPoint[] {
  const athleteResults = evalResults.filter(r => r.athleteId === athleteId);

  const attrsToAvg: string[] = attr === '_fisico' ? (PHYSICAL_ATTRIBUTES as string[]) : [attr];

  // For each date, compute the average score across all relevant attrs
  const dateMap = new Map<string, number[]>();

  for (const a of attrsToAvg) {
    const tests = evalTests.filter(t => t.attribute === a);
    for (const test of tests) {
      const results = athleteResults.filter(r => r.testId === test.id);
      for (const r of results) {
        if (!dateMap.has(r.date)) dateMap.set(r.date, []);
        dateMap.get(r.date)!.push(r.convertedScore);
      }
    }
  }

  return Array.from(dateMap.entries())
    .map(([date, scores]) => ({
      date,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function formatDate(dateStr: string): string {
  try {
    const [, mm, dd] = dateStr.split('-');
    return `${dd}/${mm}`;
  } catch {
    return dateStr;
  }
}

interface LineProps {
  points: DataPoint[];
  width: number;
  height: number;
  minVal: number;
  maxVal: number;
  color: string;
}

function Line({ points, width, height, minVal, maxVal, color }: LineProps) {
  if (points.length === 0) return null;
  const pad = { left: 36, right: 12, top: 12, bottom: 28 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    pad.left + (points.length === 1 ? chartW / 2 : (i / (points.length - 1)) * chartW);
  const toY = (val: number) =>
    pad.top + chartH - ((val - minVal) / range) * chartH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.score).toFixed(1)}`)
    .join(' ');

  return (
    <g>
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}60)` }} />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(p.score)} r={4} fill={color}
            style={{ filter: `drop-shadow(0 0 3px ${color}80)` }} />
          <circle cx={toX(i)} cy={toY(p.score)} r={8} fill={color} opacity={0} className="cursor-pointer" />
          <title>{`${p.date}: ${p.score}`}</title>
        </g>
      ))}
      {/* Last value label */}
      {points.length > 0 && (
        <text
          x={toX(points.length - 1)}
          y={toY(points[points.length - 1].score) - 8}
          textAnchor="middle"
          fontSize={9}
          fill={color}
          fontFamily="monospace"
        >
          {points[points.length - 1].score}
        </text>
      )}
    </g>
  );
}

interface EvolutionChartProps {
  athleteId: string;
  evalTests: EvalTest[];
  evalResults: EvalResult[];
  attr1: ChartAttribute;
  attr2?: ChartAttribute | null;
  width?: number;
  height?: number;
}

export function EvolutionChart({
  athleteId,
  evalTests,
  evalResults,
  attr1,
  attr2,
  width = 320,
  height = 180,
}: EvolutionChartProps) {
  const series1 = useMemo(
    () => computeSeries(athleteId, attr1, evalTests, evalResults),
    [athleteId, attr1, evalTests, evalResults]
  );
  const series2 = useMemo(
    () => (attr2 ? computeSeries(athleteId, attr2, evalTests, evalResults) : []),
    [athleteId, attr2, evalTests, evalResults]
  );

  const allScores = [...series1.map(p => p.score), ...series2.map(p => p.score)];
  const minVal = allScores.length > 0 ? Math.max(0, Math.floor(Math.min(...allScores) - 5)) : 0;
  const maxVal = allScores.length > 0 ? Math.min(100, Math.ceil(Math.max(...allScores) + 5)) : 100;

  const allDates = Array.from(new Set([...series1.map(p => p.date), ...series2.map(p => p.date)])).sort();

  const pad = { left: 36, right: 12, top: 12, bottom: 28 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const range = maxVal - minVal || 1;

  // Y-axis ticks
  const yTicks = [minVal, Math.round((minVal + maxVal) / 2), maxVal];

  if (series1.length === 0 && series2.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground font-mono text-[10px]">
        Sem avaliações registradas
      </div>
    );
  }

  return (
    <div className="w-full">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {yTicks.map(tick => {
          const y = pad.top + chartH - ((tick - minVal) / range) * chartH;
          return (
            <g key={tick}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y}
                stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 3" />
              <text x={pad.left - 4} y={y + 3} textAnchor="end" fontSize={8}
                fill="hsl(var(--muted-foreground))" fontFamily="monospace">
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels (show up to 5) */}
        {allDates.filter((_, i) => {
          if (allDates.length <= 5) return true;
          return i === 0 || i === allDates.length - 1 || i % Math.floor(allDates.length / 4) === 0;
        }).map(date => {
          const idx = allDates.indexOf(date);
          const x = pad.left + (allDates.length === 1 ? chartW / 2 : (idx / (allDates.length - 1)) * chartW);
          return (
            <text key={date} x={x} y={height - 4} textAnchor="middle" fontSize={8}
              fill="hsl(var(--muted-foreground))" fontFamily="monospace">
              {formatDate(date)}
            </text>
          );
        })}

        {/* Lines */}
        {series1.length > 0 && (
          <Line points={series1} width={width} height={height} minVal={minVal} maxVal={maxVal}
            color="hsl(var(--primary))" />
        )}
        {series2.length > 0 && (
          <Line points={series2} width={width} height={height} minVal={minVal} maxVal={maxVal}
            color="#f59e0b" />
        )}
      </svg>

      {/* Legend */}
      <div className="flex gap-3 mt-1 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5" style={{ backgroundColor: 'hsl(var(--primary))' }} />
          <span className="font-mono text-[9px] text-muted-foreground">{getLabel(attr1)}</span>
        </div>
        {attr2 && series2.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-4 h-0.5 bg-amber-400" />
            <span className="font-mono text-[9px] text-muted-foreground">{getLabel(attr2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Selector for which attributes are available for a given athlete position
export function getAvailableAttrs(position: string): ChartAttribute[] {
  const techAttrs = position === 'levantador'
    ? TECHNICAL_ATTRIBUTES.filter(a => a !== 'ataque')
    : TECHNICAL_ATTRIBUTES.filter(a => a !== 'levantamento');
  return ['_fisico', ...PHYSICAL_ATTRIBUTES as string[], ...techAttrs as string[]];
}

export { getLabel, ALL_ATTRS };
