import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { Athlete, POSITION_LABELS, Position, getAthleteAttributeScore } from '@/lib/types';
import { RadarChart } from '@/components/RadarChart';
import { ArrowLeft, RotateCcw, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

type CourtPosition = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';

const COURT_POSITIONS: CourtPosition[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

const ROTATION_MAP: Record<CourtPosition, CourtPosition> = {
  P1: 'P6', P6: 'P5', P5: 'P4', P4: 'P3', P3: 'P2', P2: 'P1',
};

const POSITION_GROUPS: { label: string; position: Position }[] = [
  { label: 'Levantadores', position: 'levantador' },
  { label: 'Ponteiros', position: 'ponteiro' },
  { label: 'Centrais', position: 'central' },
  { label: 'Opostos', position: 'oposto' },
  { label: 'Líberos', position: 'libero' },
];

const NET_POSITIONS: CourtPosition[] = ['P4', 'P3', 'P2'];
const BACK_POSITIONS: CourtPosition[] = ['P5', 'P6', 'P1'];

interface RotationAnalysis {
  ataque: number;
  bloqueio: number;
  recepcao: number;
  defesa: number;
  saque: number;
}

function analyzeFormation(
  formation: Record<CourtPosition, string | null>,
  evalTests: any[],
  evalResults: any[]
): RotationAnalysis {
  const getScore = (id: string | null, attr: string) =>
    id ? getAthleteAttributeScore(id, attr, evalTests, evalResults) : 0;

  const netIds = NET_POSITIONS.map(p => formation[p]).filter(Boolean) as string[];
  const backIds = BACK_POSITIONS.map(p => formation[p]).filter(Boolean) as string[];
  const allIds = COURT_POSITIONS.map(p => formation[p]).filter(Boolean) as string[];

  const avg = (ids: string[], attr: string) =>
    ids.length > 0 ? ids.reduce((s, id) => s + getScore(id, attr), 0) / ids.length : 0;

  return {
    ataque: avg(netIds, 'ataque'),
    bloqueio: avg(netIds, 'bloqueio'),
    recepcao: avg(backIds, 'recepcao'),
    defesa: avg(backIds, 'defesa'),
    saque: avg(allIds, 'saque'),
  };
}

export default function TacticalSystemPage() {
  const navigate = useNavigate();
  const { data } = useApp();
  const [selectedTeamId, setSelectedTeamId] = useState(data.activeTeamId);
  const [tab, setTab] = useState<'sistema' | 'rodizio'>('sistema');
  const [formation, setFormation] = useState<Record<CourtPosition, string | null>>({
    P1: null, P2: null, P3: null, P4: null, P5: null, P6: null,
  });
  const [selectingPosition, setSelectingPosition] = useState<CourtPosition | null>(null);

  const teamAthletes = useMemo(
    () => data.athletes.filter(a => a.teamId === selectedTeamId),
    [data.athletes, selectedTeamId]
  );

  const assignedIds = useMemo(() => new Set(Object.values(formation).filter(Boolean)), [formation]);

  const getAthlete = (id: string | null): Athlete | undefined =>
    id ? teamAthletes.find(a => a.id === id) : undefined;

  const handleSelectAthlete = (athleteId: string) => {
    if (!selectingPosition) return;
    setFormation(prev => ({ ...prev, [selectingPosition]: athleteId }));
    setSelectingPosition(null);
  };

  const clearFormation = () => {
    setFormation({ P1: null, P2: null, P3: null, P4: null, P5: null, P6: null });
  };

  const handleRotation = () => {
    setFormation(prev => {
      const next: Record<CourtPosition, string | null> = { P1: null, P2: null, P3: null, P4: null, P5: null, P6: null };
      for (const pos of COURT_POSITIONS) {
        next[ROTATION_MAP[pos]] = prev[pos];
      }
      return next;
    });
  };

  // Current rotation analysis
  const analysis = useMemo(
    () => analyzeFormation(formation, data.evalTests, data.evalResults),
    [formation, data.evalTests, data.evalResults]
  );

  // Radar data
  const radarLabels = ['Ataque', 'Bloqueio', 'Recepção', 'Defesa', 'Saque'];
  const radarValues = useMemo(
    () => [analysis.ataque, analysis.bloqueio, analysis.recepcao, analysis.defesa, analysis.saque],
    [analysis]
  );

  // Rotation history: simulate all 6 rotations
  const rotationHistory = useMemo(() => {
    const hasPlayers = COURT_POSITIONS.some(p => formation[p]);
    if (!hasPlayers) return [];

    const history: { rotation: number; analysis: RotationAnalysis }[] = [];
    let current = { ...formation };

    for (let i = 0; i < 6; i++) {
      history.push({
        rotation: i + 1,
        analysis: analyzeFormation(current, data.evalTests, data.evalResults),
      });
      // Rotate for next
      const next: Record<CourtPosition, string | null> = { P1: null, P2: null, P3: null, P4: null, P5: null, P6: null };
      for (const pos of COURT_POSITIONS) {
        next[ROTATION_MAP[pos]] = current[pos];
      }
      current = next;
    }
    return history;
  }, [formation, data.evalTests, data.evalResults]);

  const teams = data.teams;
  const hasPlayersOnCourt = COURT_POSITIONS.some(p => formation[p]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-mono text-lg font-bold neon-text tracking-wider">Sistema Tático</h1>
          <p className="font-mono text-[10px] text-muted-foreground">Organize posições e visualize a formação em quadra</p>
        </div>
      </div>

      {/* Team selector */}
      <div className="flex gap-2 mb-4">
        {teams.map(team => (
          <button
            key={team.id}
            onClick={() => { setSelectedTeamId(team.id); clearFormation(); }}
            className={`flex-1 font-mono text-xs py-2 px-3 rounded border transition-all ${
              selectedTeamId === team.id
                ? 'border-primary text-primary neon-border'
                : 'border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {team.name}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'sistema' as const, label: 'Sistema de Vôlei' },
          { key: 'rodizio' as const, label: 'Rodízio' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 font-mono text-xs py-2 rounded border transition-all ${
              tab === t.key
                ? 'border-primary text-primary bg-primary/10 neon-border'
                : 'border-border text-muted-foreground hover:border-primary/30'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Court */}
      <div className="relative mx-auto w-full max-w-sm aspect-[3/4] rounded-lg border border-primary/30 bg-card overflow-hidden neon-border mb-4">
        {/* Court lines */}
        <div className="absolute inset-0">
          {/* Net at top */}
          <div className="absolute left-0 right-0 h-[3px] bg-primary/60 shadow-[0_0_8px_hsl(var(--primary)/0.5)]" style={{ top: '12%' }} />
          <span className="absolute font-mono text-[9px] text-primary/60 uppercase tracking-widest" style={{ top: '6%', left: '50%', transform: 'translateX(-50%)' }}>
            Rede
          </span>
          {/* 3m line */}
          <div className="absolute left-0 right-0 h-[2px] bg-primary/40" style={{ top: '45%' }} />
          {/* Side lines */}
          <div className="absolute top-0 bottom-0 left-[5%] w-[1px] bg-primary/15" />
          <div className="absolute top-0 bottom-0 right-[5%] w-[1px] bg-primary/15" />
          {/* Attack zone */}
          <div className="absolute left-0 right-0 bg-primary/5" style={{ top: '12%', height: '33%' }} />
        </div>

        {/* Front row: P4, P3, P2 (below net) */}
        <div className="absolute flex justify-around px-[10%]" style={{ top: '22%', left: 0, right: 0 }}>
          {(['P4', 'P3', 'P2'] as CourtPosition[]).map(pos => (
            <CourtPositionCircle
              key={pos}
              pos={pos}
              athlete={getAthlete(formation[pos])}
              isNet={true}
              onClick={() => setSelectingPosition(pos)}
            />
          ))}
        </div>

        {/* Back row: P5, P6, P1 */}
        <div className="absolute flex justify-around px-[10%]" style={{ top: '65%', left: 0, right: 0 }}>
          {(['P5', 'P6', 'P1'] as CourtPosition[]).map(pos => (
            <CourtPositionCircle
              key={pos}
              pos={pos}
              athlete={getAthlete(formation[pos])}
              isNet={false}
              onClick={() => setSelectingPosition(pos)}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-6 max-w-sm mx-auto w-full">
        <button
          onClick={clearFormation}
          className="flex-1 flex items-center justify-center gap-2 font-mono text-xs py-2 rounded border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-all"
        >
          <Trash2 className="w-4 h-4" />
          Limpar Formação
        </button>
        {tab === 'rodizio' && (
          <button
            onClick={handleRotation}
            className="flex-1 flex items-center justify-center gap-2 font-mono text-xs py-2 rounded border border-primary text-primary neon-border transition-all hover:bg-primary/10"
          >
            <RotateCcw className="w-4 h-4" />
            Simular Rodízio
          </button>
        )}
      </div>

      {/* Rotation Analysis Panel */}
      {hasPlayersOnCourt && (
        <div className="mb-6">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Análise da Rotação</h3>
          <div className="card-surface neon-border rounded-lg p-4 space-y-3">
            {[
              { label: 'Ataque', value: analysis.ataque, desc: 'Linha da rede' },
              { label: 'Bloqueio', value: analysis.bloqueio, desc: 'Linha da rede' },
              { label: 'Recepção', value: analysis.recepcao, desc: 'Linha de trás' },
              { label: 'Defesa', value: analysis.defesa, desc: 'Linha de trás' },
              { label: 'Saque', value: analysis.saque, desc: 'Todos' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-foreground">{item.label}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">({item.desc})</span>
                  </div>
                  <span className="font-mono text-xs text-primary font-bold">{Math.round(item.value)}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${item.value}%`, boxShadow: '0 0 6px hsl(var(--primary) / 0.5)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formation Radar */}
      {hasPlayersOnCourt && (
        <div className="flex flex-col items-center mb-6">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Radar da Formação</h3>
          <div className="card-surface neon-border rounded-lg p-4">
            <RadarChart labels={radarLabels} values={radarValues} size={220} />
          </div>
        </div>
      )}

      {/* Rotation History (Rodízio tab) */}
      {tab === 'rodizio' && rotationHistory.length > 0 && (
        <div className="mb-8">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Histórico das 6 Rotações</h3>
          <div className="card-surface neon-border rounded-lg p-4 space-y-2">
            {rotationHistory.map((r, i) => {
              const maxAtk = Math.max(...rotationHistory.map(h => h.analysis.ataque));
              const isBest = r.analysis.ataque === maxAtk && maxAtk > 0;
              return (
                <div key={i} className={`flex items-center gap-3 p-2 rounded ${isBest ? 'bg-primary/10 border border-primary/30' : ''}`}>
                  <span className="font-mono text-xs text-muted-foreground w-16">Rot. {r.rotation}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-foreground w-14">Ataque</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${r.analysis.ataque}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-primary w-6 text-right">{Math.round(r.analysis.ataque)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-foreground w-14">Bloqueio</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${r.analysis.bloqueio}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-primary/70 w-6 text-right">{Math.round(r.analysis.bloqueio)}</span>
                    </div>
                  </div>
                  {isBest && <span className="font-mono text-[9px] text-primary">★</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Athlete selector panel */}
      <AnimatePresence>
        {selectingPosition && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={() => setSelectingPosition(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 right-0 bottom-0 max-h-[70vh] bg-card border-t border-primary/30 rounded-t-xl z-50 overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-mono text-sm font-bold neon-text">
                  Selecionar Atleta — {selectingPosition}
                </h3>
                <button onClick={() => setSelectingPosition(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formation[selectingPosition] && (
                <button
                  onClick={() => { setFormation(prev => ({ ...prev, [selectingPosition]: null })); setSelectingPosition(null); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 border-b border-border font-mono"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover Atleta
                </button>
              )}

              <div className="p-4 space-y-4">
                {POSITION_GROUPS.map(group => {
                  const athletes = teamAthletes.filter(a => a.position === group.position && !assignedIds.has(a.id));
                  if (athletes.length === 0) return null;
                  return (
                    <div key={group.position}>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">{group.label}</p>
                      {athletes.map(a => (
                        <button
                          key={a.id}
                          onClick={() => handleSelectAthlete(a.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-primary/10 transition-all"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-mono text-xs text-primary">
                            {a.number}
                          </div>
                          <div className="text-left">
                            <p className="text-sm text-foreground">{a.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{POSITION_LABELS[a.position]}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
                {teamAthletes.filter(a => !assignedIds.has(a.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4 font-mono">Nenhum atleta disponível</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function CourtPositionCircle({
  pos,
  athlete,
  isNet,
  onClick,
}: {
  pos: CourtPosition;
  athlete?: Athlete;
  isNet: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 transition-all ${
        isNet
          ? 'border-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.3)] bg-primary/10'
          : 'border-primary/30 bg-card'
      } hover:border-primary hover:shadow-[0_0_16px_hsl(var(--primary)/0.5)]`}
    >
      {athlete ? (
        <>
          <span className="text-[11px] font-bold text-foreground leading-tight truncate max-w-[54px]">
            {athlete.name.split(' ')[0]}
          </span>
          <span className="text-[8px] text-primary font-mono">{POSITION_LABELS[athlete.position]}</span>
          <span className="text-[8px] text-muted-foreground font-mono">{pos}</span>
        </>
      ) : (
        <span className="font-mono text-sm text-primary/70">{pos}</span>
      )}
    </button>
  );
}
