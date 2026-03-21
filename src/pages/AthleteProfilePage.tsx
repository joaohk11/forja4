import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { RadarChart } from '@/components/RadarChart';
import {
  POSITION_LABELS,
  PHYSICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
  calculateAthleteLevel, getAthleteAttributeScore, getAthleteAttributeLastDate,
  TechnicalAttribute,
} from '@/lib/types';
import { ArrowLeft, User, Camera, Trash2, Star, Brain, Sparkles, TrendingUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { EvolutionChart, getAvailableAttrs, getLabel } from '@/components/EvolutionChart';

const formatAttrDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
};

function scoreColor(score: number): string {
  if (score > 80) return 'text-green-400';
  if (score < 50 && score > 0) return 'text-red-400';
  return 'text-primary';
}

const AthleteProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, updateAthlete } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showEvolution, setShowEvolution] = useState(false);
  const [evoAttr1, setEvoAttr1] = useState<string>('_fisico');
  const [evoAttr2, setEvoAttr2] = useState<string | null>(null);

  const athlete = data.athletes.find(a => a.id === id);
  const team = athlete ? data.teams.find(t => t.id === athlete.teamId) : null;

  // Apply levantador logic: replace 'ataque' with focus on 'levantamento'
  const activeTechnicalAttrs = useMemo((): TechnicalAttribute[] => {
    if (!athlete) return TECHNICAL_ATTRIBUTES;
    if (athlete.position === 'levantador') {
      return TECHNICAL_ATTRIBUTES.filter(a => a !== 'ataque');
    }
    return TECHNICAL_ATTRIBUTES.filter(a => a !== 'levantamento');
  }, [athlete]);

  const availableEvoAttrs = useMemo(
    () => (athlete ? getAvailableAttrs(athlete.position) : []),
    [athlete]
  );

  const physicalScores = useMemo(() => {
    if (!athlete) return PHYSICAL_ATTRIBUTES.map(() => 0);
    return PHYSICAL_ATTRIBUTES.map(attr =>
      getAthleteAttributeScore(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, data.evalTests, data.evalResults]);

  const physicalDates = useMemo(() => {
    if (!athlete) return PHYSICAL_ATTRIBUTES.map(() => null as string | null);
    return PHYSICAL_ATTRIBUTES.map(attr =>
      getAthleteAttributeLastDate(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, data.evalTests, data.evalResults]);

  const technicalScores = useMemo(() => {
    if (!athlete) return activeTechnicalAttrs.map(() => 0);
    return activeTechnicalAttrs.map(attr =>
      getAthleteAttributeScore(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, activeTechnicalAttrs, data.evalTests, data.evalResults]);

  const technicalDates = useMemo(() => {
    if (!athlete) return activeTechnicalAttrs.map(() => null as string | null);
    return activeTechnicalAttrs.map(attr =>
      getAthleteAttributeLastDate(athlete.id, attr, data.evalTests || [], data.evalResults || [])
    );
  }, [athlete, activeTechnicalAttrs, data.evalTests, data.evalResults]);

  const level = useMemo(() => {
    if (!athlete) return 0;
    return calculateAthleteLevel(athlete.id, data.evalTests || [], data.evalResults || []);
  }, [athlete, data.evalTests, data.evalResults]);

  // Check if athlete has any eval results (to show evolution button)
  const hasEvalData = useMemo(() => {
    if (!athlete) return false;
    return (data.evalResults || []).some(r => r.athleteId === athlete.id);
  }, [athlete, data.evalResults]);

  if (!athlete) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground font-body">Atleta não encontrado</p>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateAthlete({ ...athlete, photo: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const physicalLabels = PHYSICAL_ATTRIBUTES.map(a => PHYSICAL_ATTRIBUTE_LABELS[a]);
  const technicalLabels = activeTechnicalAttrs.map(a => TECHNICAL_ATTRIBUTE_LABELS[a]);

  return (
    <div className="pb-8">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <div className="flex gap-2">
          {hasEvalData && (
            <button
              onClick={() => setShowEvolution(true)}
              className="flex items-center gap-1 text-primary font-mono text-[10px] hover:neon-text"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Evolução
            </button>
          )}
          <button
            onClick={() => navigate(`/ia-treinador?tab=atleta&athleteId=${athlete.id}`)}
            className="flex items-center gap-1 text-primary font-mono text-[10px] hover:neon-text"
          >
            <Brain className="w-3.5 h-3.5" /> Analisar
          </button>
          <button
            onClick={() => navigate(`/ia-treinador?tab=treino`)}
            className="flex items-center gap-1 text-primary font-mono text-[10px] hover:neon-text"
          >
            <Sparkles className="w-3.5 h-3.5" /> Treino IA
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="mx-4 card-surface neon-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-4 p-4">
          {/* Photo */}
          <div className="relative group">
            <div className="w-20 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {athlete.photo ? (
                <img src={athlete.photo} alt={athlete.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
              )}
            </div>
            <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded-lg">
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary">
                <Camera className="w-4 h-4" strokeWidth={1.5} />
              </button>
              {athlete.photo && (
                <button onClick={() => updateAthlete({ ...athlete, photo: undefined })} className="p-1.5 rounded-full bg-destructive/20 border border-destructive/40 text-destructive">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-primary text-xs">#{athlete.number}</span>
              <h2 className="font-mono text-lg font-bold neon-text truncate">{athlete.name}</h2>
            </div>
            <p className="font-body text-xs text-muted-foreground">
              {POSITION_LABELS[athlete.position]} · {athlete.height}cm · {athlete.age} anos
            </p>
            {team && <p className="font-mono text-[10px] text-primary/70 mt-1">{team.name}</p>}
          </div>
        </div>

        {/* Level badge */}
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" strokeWidth={1.5} />
            <span className="font-mono text-sm text-foreground">Nível do Atleta</span>
          </div>
          <span className="font-mono text-2xl font-bold neon-text">{level || '—'}</span>
        </div>
      </div>

      {/* Physical attributes */}
      <div className="mx-4 mt-6">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Atributos Físicos</h3>
        <div className="card-surface neon-border rounded-lg p-4">
          <div className="space-y-2.5 mb-4">
            {PHYSICAL_ATTRIBUTES.map((attr, i) => (
              <div key={attr}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground w-20 text-right">{PHYSICAL_ATTRIBUTE_LABELS[attr]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${physicalScores[i]}%`, boxShadow: '0 0 6px hsl(var(--primary) / 0.5)' }}
                    />
                  </div>
                  <span className={`font-mono text-xs font-bold w-8 text-right ${scoreColor(physicalScores[i])}`}>
                    {Math.round(physicalScores[i]) || '—'}
                  </span>
                </div>
                {physicalDates[i] && (
                  <p className="font-mono text-[8px] text-muted-foreground text-right mt-0.5 pl-24">
                    Última avaliação: {formatAttrDate(physicalDates[i])}
                  </p>
                )}
              </div>
            ))}
          </div>
          <RadarChart labels={physicalLabels} values={physicalScores} title="Radar Físico" size={240} />
        </div>
      </div>

      {/* Technical attributes */}
      <div className="mx-4 mt-4">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Atributos Técnicos</h3>
        <div className="card-surface neon-border rounded-lg p-4">
          <div className="space-y-2.5 mb-4">
            {activeTechnicalAttrs.map((attr, i) => (
              <div key={attr}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted-foreground w-24 text-right">{TECHNICAL_ATTRIBUTE_LABELS[attr]}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${technicalScores[i]}%`, boxShadow: '0 0 6px hsl(var(--primary) / 0.5)' }}
                    />
                  </div>
                  <span className={`font-mono text-xs font-bold w-8 text-right ${scoreColor(technicalScores[i])}`}>
                    {Math.round(technicalScores[i]) || '—'}
                  </span>
                </div>
                {technicalDates[i] && (
                  <p className="font-mono text-[8px] text-muted-foreground text-right mt-0.5 pl-28">
                    Última avaliação: {formatAttrDate(technicalDates[i])}
                  </p>
                )}
              </div>
            ))}
          </div>
          <RadarChart labels={technicalLabels} values={technicalScores} title="Radar Técnico" size={240} />
        </div>
      </div>

      {/* Observation */}
      {athlete.observation && (
        <div className="mx-4 mt-4 card-surface neon-border rounded-lg p-4">
          <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Observação</h3>
          <p className="font-body text-sm text-foreground">{athlete.observation}</p>
        </div>
      )}

      {/* Evolution Modal */}
      {showEvolution && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEvolution(false); }}>
          <div className="w-full max-w-lg bg-card border border-border rounded-t-2xl p-5 pb-8 space-y-4"
            style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-mono text-sm font-bold neon-text flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Evolução do Atleta
                </h3>
                <p className="font-mono text-[10px] text-muted-foreground">{athlete.name}</p>
              </div>
              <button onClick={() => setShowEvolution(false)} className="p-1.5 rounded text-muted-foreground hover:text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Attribute 1 selector */}
            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1.5">Habilidade principal</p>
              <div className="flex flex-wrap gap-1.5">
                {availableEvoAttrs.map(attr => (
                  <button
                    key={attr}
                    onClick={() => { setEvoAttr1(attr); if (evoAttr2 === attr) setEvoAttr2(null); }}
                    className={`font-mono text-[9px] px-2 py-1 rounded border transition-all ${
                      evoAttr1 === attr
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {getLabel(attr)}
                  </button>
                ))}
              </div>
            </div>

            {/* Attribute 2 selector (optional) */}
            <div>
              <p className="font-mono text-[10px] text-muted-foreground mb-1.5">Comparar com (opcional)</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setEvoAttr2(null)}
                  className={`font-mono text-[9px] px-2 py-1 rounded border transition-all ${
                    evoAttr2 === null
                      ? 'border-amber-400/70 text-amber-400 bg-amber-400/10'
                      : 'border-border text-muted-foreground hover:border-amber-400/30'
                  }`}
                >
                  Nenhum
                </button>
                {availableEvoAttrs.filter(a => a !== evoAttr1).map(attr => (
                  <button
                    key={attr}
                    onClick={() => setEvoAttr2(evoAttr2 === attr ? null : attr)}
                    className={`font-mono text-[9px] px-2 py-1 rounded border transition-all ${
                      evoAttr2 === attr
                        ? 'border-amber-400/70 text-amber-400 bg-amber-400/10'
                        : 'border-border text-muted-foreground hover:border-amber-400/30'
                    }`}
                  >
                    {getLabel(attr)}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="card-surface border border-border rounded-lg p-4">
              <EvolutionChart
                athleteId={athlete.id}
                evalTests={data.evalTests || []}
                evalResults={data.evalResults || []}
                attr1={evoAttr1}
                attr2={evoAttr2}
                width={320}
                height={180}
              />
            </div>

            <p className="font-mono text-[9px] text-muted-foreground text-center">
              Cada ponto = avaliação registrada · Mostrando todas as avaliações históricas
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteProfilePage;
