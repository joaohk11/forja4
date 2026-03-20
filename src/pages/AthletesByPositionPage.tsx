import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { ArrowLeft, ChevronDown, ChevronUp, GitCompare, X } from 'lucide-react';
import {
  Position, POSITION_LABELS,
  getAthleteAttributeScore, getAthleteFisicoScore,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
  PHYSICAL_ATTRIBUTES,
} from '@/lib/types';
import { Athlete } from '@/lib/types';

const POSITIONS: Position[] = ['levantador', 'ponteiro', 'central', 'oposto', 'libero'];

const POSITION_COLORS: Record<Position, string> = {
  levantador: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  ponteiro:   'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
  central:    'text-purple-400 border-purple-400/30 bg-purple-400/10',
  oposto:     'text-orange-400 border-orange-400/30 bg-orange-400/10',
  libero:     'text-green-400 border-green-400/30 bg-green-400/10',
};

const POSITION_BORDER: Record<Position, string> = {
  levantador: 'border-yellow-400/40',
  ponteiro:   'border-cyan-400/40',
  central:    'border-purple-400/40',
  oposto:     'border-orange-400/40',
  libero:     'border-green-400/40',
};

// Skills displayed on mini radar — for levantador, swap ataque → levantamento
function getSkillsForPosition(position: Position) {
  if (position === 'levantador') {
    return [
      { key: 'levantamento', label: 'Lev' },
      { key: 'bloqueio',     label: 'Blq' },
      { key: 'recepcao',     label: 'Passe' },
      { key: 'defesa',       label: 'Def' },
      { key: 'saque',        label: 'Saque' },
    ];
  }
  return [
    { key: 'ataque',      label: 'Atq' },
    { key: 'bloqueio',    label: 'Blq' },
    { key: 'recepcao',    label: 'Passe' },
    { key: 'defesa',      label: 'Def' },
    { key: 'levantamento',label: 'Lev' },
  ];
}

// ── Mini Radar SVG ───────────────────────────────────────────────────────────
function MiniRadar({ values, size = 80 }: { values: number[]; size?: number }) {
  const n = values.length;
  const center = size / 2;
  const r = size / 2 - 8;
  const levels = 3;

  const pts = Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });

  const levelPolys = Array.from({ length: levels }, (_, l) => {
    const lr = (r * (l + 1)) / levels;
    return pts.map(p => `${center + p.x * lr},${center + p.y * lr}`).join(' ');
  });

  const dataPoly = pts.map((p, i) => {
    const v = Math.min(values[i] || 0, 100);
    const rv = (v / 100) * r;
    return `${center + p.x * rv},${center + p.y * rv}`;
  }).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {levelPolys.map((poly, i) => (
        <polygon key={i} points={poly} fill="none" stroke="hsl(var(--primary)/0.15)" strokeWidth={0.5} />
      ))}
      {pts.map((p, i) => (
        <line key={i} x1={center} y1={center}
          x2={center + p.x * r} y2={center + p.y * r}
          stroke="hsl(var(--primary)/0.15)" strokeWidth={0.5} />
      ))}
      <polygon points={dataPoly}
        fill="hsl(var(--primary)/0.2)"
        stroke="hsl(var(--primary))"
        strokeWidth={1.5} />
      {pts.map((p, i) => {
        const v = Math.min(values[i] || 0, 100);
        const rv = (v / 100) * r;
        return (
          <circle key={i}
            cx={center + p.x * rv}
            cy={center + p.y * rv}
            r={2}
            fill="hsl(var(--primary))"
          />
        );
      })}
    </svg>
  );
}

// ── Athlete Mini Card ─────────────────────────────────────────────────────────
interface MiniCardProps {
  athlete: Athlete;
  position: Position;
  fisico: number;
  skillValues: number[];
  skillLabels: { key: string; label: string }[];
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}

function AthleteCard({ athlete, position, fisico, skillValues, skillLabels, selected, onToggle, onOpen }: MiniCardProps) {
  return (
    <div
      className={`card-surface rounded-xl p-3 border transition-all cursor-pointer ${
        selected ? `${POSITION_BORDER[position]} ring-2 ring-offset-1 ring-offset-background ring-primary/50` : 'border-border/40'
      }`}
      onClick={onOpen}
    >
      {/* Selection checkbox top-right */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-primary text-[10px]">#{athlete.number}</span>
            <span className="font-mono text-xs text-foreground truncate">{athlete.name}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {athlete.height && (
              <span className="font-mono text-[9px] text-muted-foreground">{athlete.height}cm</span>
            )}
            {athlete.age && (
              <span className="font-mono text-[9px] text-muted-foreground">· {athlete.age}a</span>
            )}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all ${
            selected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-transparent hover:border-primary/50'
          }`}
        >
          <span className="text-[10px] font-bold">✓</span>
        </button>
      </div>

      {/* Mini radar */}
      <div className="flex items-center gap-2">
        <MiniRadar values={skillValues} size={76} />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {skillLabels.map((sk, i) => (
            <div key={sk.key} className="flex items-center gap-1">
              <span className="font-mono text-[8px] text-muted-foreground w-8 flex-shrink-0">{sk.label}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${skillValues[i]}%`, boxShadow: '0 0 3px hsl(var(--primary)/0.5)' }}
                />
              </div>
              <span className="font-mono text-[8px] text-primary w-5 text-right flex-shrink-0">
                {skillValues[i] > 0 ? Math.round(skillValues[i]) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Físico badge — only here */}
      {fisico > 0 && (
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[9px] text-muted-foreground">Físico</span>
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow-400"
                style={{ width: `${fisico}%`, boxShadow: '0 0 3px #facc15' }}
              />
            </div>
            <span className="font-mono text-[10px] text-yellow-400 font-bold">{Math.round(fisico)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Comparison View ───────────────────────────────────────────────────────────
function ComparisonPanel({
  athletes,
  position,
  evalTests,
  evalResults,
  onClose,
}: {
  athletes: Athlete[];
  position: Position;
  evalTests: any[];
  evalResults: any[];
  onClose: () => void;
}) {
  const skills = getSkillsForPosition(position);
  const ALL_ATTRS = [
    ...skills.map(s => ({ key: s.key, label: s.label })),
    { key: 'saque', label: 'Saque' },
    { key: 'cobertura', label: 'Cobertura' },
    { key: 'leitura_de_jogo', label: 'Leitura' },
  ];

  // Deduplicate
  const uniqueAttrs = ALL_ATTRS.filter((a, idx, arr) => arr.findIndex(x => x.key === a.key) === idx);

  const getScore = (athleteId: string, attr: string) =>
    getAthleteAttributeScore(athleteId, attr, evalTests, evalResults);

  const getFisico = (athleteId: string) =>
    getAthleteFisicoScore(athleteId, evalTests, evalResults);

  const posColors = ['text-cyan-400', 'text-yellow-400', 'text-pink-400', 'text-green-400'];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm font-bold neon-text">Comparação</h2>
          <p className="font-mono text-[10px] text-muted-foreground">{POSITION_LABELS[position]} · {athletes.length} atletas</p>
        </div>
        <button onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Athlete names row */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `120px repeat(${athletes.length}, 1fr)` }}>
          <div />
          {athletes.map((a, i) => (
            <div key={a.id} className="text-center">
              <span className={`font-mono text-xs font-bold ${posColors[i % posColors.length]}`}>
                #{a.number} {a.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>

        {/* Físico row */}
        <div className="grid gap-2 items-center" style={{ gridTemplateColumns: `120px repeat(${athletes.length}, 1fr)` }}>
          <span className="font-mono text-[10px] text-yellow-400 font-semibold">Físico</span>
          {athletes.map(a => {
            const val = getFisico(a.id);
            return (
              <div key={a.id} className="flex flex-col items-center gap-1">
                <span className="font-mono text-sm font-bold text-yellow-400">{val > 0 ? Math.round(val) : '—'}</span>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-yellow-400" style={{ width: `${val}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-px bg-border" />

        {/* Attributes */}
        {uniqueAttrs.map(attr => {
          const scores = athletes.map(a => getScore(a.id, attr.key));
          const max = Math.max(...scores);
          const anyHasData = scores.some(s => s > 0);

          return (
            <div key={attr.key} className="grid gap-2 items-center" style={{ gridTemplateColumns: `120px repeat(${athletes.length}, 1fr)` }}>
              <span className="font-mono text-[10px] text-muted-foreground">{attr.label}</span>
              {athletes.map((a, i) => {
                const val = scores[i];
                const isTop = val === max && val > 0 && scores.filter(s => s === max).length < athletes.length;
                return (
                  <div key={a.id} className="flex flex-col items-center gap-1">
                    <span className={`font-mono text-sm font-bold ${isTop ? posColors[i % posColors.length] : 'text-foreground'}`}>
                      {val > 0 ? Math.round(val) : anyHasData ? '—' : '—'}
                    </span>
                    {anyHasData && (
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${val}%`,
                            opacity: isTop ? 1 : 0.5,
                            boxShadow: isTop ? '0 0 4px hsl(var(--primary)/0.7)' : undefined,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="h-4" />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AthletesByPositionPage() {
  const navigate = useNavigate();
  const { data, activeTeamId } = useApp();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [comparing, setComparing] = useState<{ position: Position } | null>(null);

  const teamAthletes = useMemo(
    () => data.athletes.filter(a => a.teamId === activeTeamId).sort((a, b) => a.number - b.number),
    [data.athletes, activeTeamId]
  );

  const byPosition = useMemo(() => {
    const map: Record<Position, Athlete[]> = {
      levantador: [], ponteiro: [], central: [], oposto: [], libero: [],
    };
    teamAthletes.forEach(a => map[a.position]?.push(a));
    return map;
  }, [teamAthletes]);

  const toggleCollapse = (pos: Position) =>
    setCollapsed(prev => ({ ...prev, [pos]: !prev[pos] }));

  const toggleSelect = (pos: Position, athleteId: string) => {
    setSelected(prev => {
      const current = prev[pos] || [];
      const next = current.includes(athleteId)
        ? current.filter(id => id !== athleteId)
        : [...current, athleteId];
      return { ...prev, [pos]: next };
    });
  };

  const startCompare = (pos: Position) => {
    if ((selected[pos] || []).length < 2) return;
    setComparing({ position: pos });
  };

  const compareAthletes = comparing
    ? byPosition[comparing.position].filter(a => (selected[comparing.position] || []).includes(a.id))
    : [];

  return (
    <div className="px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="font-mono text-lg font-bold neon-text tracking-wider">Atletas por Posição</h1>
          <p className="font-mono text-[10px] text-muted-foreground">
            {teamAthletes.length} atleta{teamAthletes.length !== 1 ? 's' : ''} · selecione 2+ para comparar
          </p>
        </div>
      </div>

      {teamAthletes.length === 0 && (
        <div className="text-center py-16">
          <p className="font-body text-sm text-muted-foreground">Nenhum atleta cadastrado</p>
        </div>
      )}

      <div className="space-y-5">
        {POSITIONS.map(position => {
          const athletes = byPosition[position];
          if (athletes.length === 0) return null;

          const isCollapsed = collapsed[position];
          const selectedIds = selected[position] || [];
          const colorClass = POSITION_COLORS[position];
          const canCompare = selectedIds.length >= 2;

          return (
            <div key={position} className="rounded-xl border border-border/40 overflow-hidden">
              {/* Position header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                <button
                  onClick={() => toggleCollapse(position)}
                  className="flex items-center gap-2 flex-1"
                >
                  <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${colorClass}`}>
                    {POSITION_LABELS[position]}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {athletes.length} atleta{athletes.length !== 1 ? 's' : ''}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
                  )}
                </button>
                {canCompare && (
                  <button
                    onClick={() => startCompare(position)}
                    className="flex items-center gap-1.5 ml-3 font-mono text-[10px] text-primary border border-primary/30 rounded px-2 py-1 hover:bg-primary/10 transition-all"
                  >
                    <GitCompare className="w-3 h-3" strokeWidth={1.5} />
                    Comparar ({selectedIds.length})
                  </button>
                )}
              </div>

              {/* Athlete cards grid */}
              {!isCollapsed && (
                <div className="p-3 grid grid-cols-2 gap-3">
                  {athletes.map(athlete => {
                    const skills = getSkillsForPosition(position);
                    const skillValues = skills.map(s =>
                      getAthleteAttributeScore(athlete.id, s.key, data.evalTests, data.evalResults)
                    );
                    const fisico = getAthleteFisicoScore(athlete.id, data.evalTests, data.evalResults);

                    return (
                      <AthleteCard
                        key={athlete.id}
                        athlete={athlete}
                        position={position}
                        fisico={fisico}
                        skillValues={skillValues}
                        skillLabels={skills}
                        selected={selectedIds.includes(athlete.id)}
                        onToggle={() => toggleSelect(position, athlete.id)}
                        onOpen={() => navigate(`/atleta/${athlete.id}`)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Comparison overlay */}
      {comparing && compareAthletes.length >= 2 && (
        <ComparisonPanel
          athletes={compareAthletes}
          position={comparing.position}
          evalTests={data.evalTests}
          evalResults={data.evalResults}
          onClose={() => setComparing(null)}
        />
      )}
    </div>
  );
}
