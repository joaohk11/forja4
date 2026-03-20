import { useState, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { RadarChart } from '@/components/RadarChart';
import {
  PHYSICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
  getAthleteAttributeScore,
} from '@/lib/types';
import { Camera, Trash2, Users, Ruler, Clock, ImagePlus, Edit2, ArrowLeft, X } from 'lucide-react';

function scoreColor(score: number): string {
  if (score > 80) return 'text-green-400';
  if (score < 50 && score > 0) return 'text-red-400';
  return 'text-foreground';
}

type RadarTab = 'tecnico' | 'fisico';

const TeamProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, updateTeamName, updateTeamPhoto } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [activeTab, setActiveTab] = useState<RadarTab>('tecnico');

  const team = data.teams.find(t => t.id === id);
  const teamAthletes = useMemo(
    () => data.athletes.filter(a => a.teamId === id).sort((a, b) => a.number - b.number),
    [data.athletes, id]
  );

  const physicalAvg = useMemo(() => {
    if (teamAthletes.length === 0) return PHYSICAL_ATTRIBUTES.map(() => 0);
    return PHYSICAL_ATTRIBUTES.map(attr => {
      const scores = teamAthletes.map(a =>
        getAthleteAttributeScore(a.id, attr, data.evalTests || [], data.evalResults || [])
      );
      return scores.reduce((s, v) => s + v, 0) / scores.length;
    });
  }, [teamAthletes, data.evalTests, data.evalResults]);

  const technicalAvg = useMemo(() => {
    if (teamAthletes.length === 0) return TECHNICAL_ATTRIBUTES.map(() => 0);
    return TECHNICAL_ATTRIBUTES.map(attr => {
      const scores = teamAthletes.map(a =>
        getAthleteAttributeScore(a.id, attr, data.evalTests || [], data.evalResults || [])
      );
      return scores.reduce((s, v) => s + v, 0) / scores.length;
    });
  }, [teamAthletes, data.evalTests, data.evalResults]);

  const avgHeight = teamAthletes.length
    ? (teamAthletes.reduce((s, a) => s + (parseFloat(a.height) || 0), 0) / teamAthletes.length).toFixed(1)
    : null;

  const avgAge = teamAthletes.length
    ? (teamAthletes.reduce((s, a) => s + a.age, 0) / teamAthletes.length).toFixed(1)
    : null;

  if (!team) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-muted-foreground font-body">Time não encontrado</p>
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateTeamPhoto(team.id, ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleNameSave = () => {
    if (nameValue.trim()) updateTeamName(team.id, nameValue.trim());
    else setNameValue(team.name);
    setEditingName(false);
  };

  const physicalLabels = PHYSICAL_ATTRIBUTES.map(a => PHYSICAL_ATTRIBUTE_LABELS[a]);
  const technicalLabels = TECHNICAL_ATTRIBUTES.map(a => TECHNICAL_ATTRIBUTE_LABELS[a]);

  const currentLabels  = activeTab === 'tecnico' ? technicalLabels  : physicalLabels;
  const currentValues  = activeTab === 'tecnico' ? technicalAvg     : physicalAvg;
  const currentAttrs   = activeTab === 'tecnico' ? TECHNICAL_ATTRIBUTES : PHYSICAL_ATTRIBUTES;
  const currentLabelMap = activeTab === 'tecnico' ? TECHNICAL_ATTRIBUTE_LABELS : PHYSICAL_ATTRIBUTE_LABELS;

  const hasData = teamAthletes.length > 0 && currentValues.some(v => v > 0);

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
      </div>

      {/* Cover / Team Photo */}
      <div className="relative mx-4 rounded-xl overflow-hidden neon-border card-surface">
        <div className="h-44 flex items-center justify-center bg-muted/30 relative group">
          {team.photo ? (
            <img src={team.photo} alt={team.name} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImagePlus className="w-10 h-10" strokeWidth={1} />
              <span className="font-mono text-[10px] uppercase tracking-widest">Foto do Time</span>
            </div>
          )}
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors"
            >
              <Camera className="w-5 h-5" strokeWidth={1.5} />
            </button>
            {team.photo && (
              <button
                onClick={() => updateTeamPhoto(team.id, undefined)}
                className="p-2.5 rounded-full bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30 transition-colors"
              >
                <Trash2 className="w-5 h-5" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        {/* Team name */}
        <div className="p-4 flex items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                autoFocus
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameSave()}
                className="flex-1 bg-background border border-primary/50 rounded px-3 py-1.5 font-mono text-lg text-foreground focus:outline-none focus:border-primary"
              />
              <button onClick={handleNameSave} className="text-primary font-mono text-xs px-2 py-1 border border-primary/40 rounded hover:bg-primary/10">OK</button>
              <button onClick={() => { setNameValue(team.name); setEditingName(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameValue(team.name); setEditingName(true); }}
              className="flex items-center gap-2 group/name"
            >
              <h2 className="font-mono text-xl font-bold neon-text">{team.name}</h2>
              <Edit2 className="w-4 h-4 text-muted-foreground opacity-0 group-hover/name:opacity-100 transition-opacity" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
        <StatCard icon={Users} label="Atletas"     value={String(teamAthletes.length)} />
        <StatCard icon={Ruler} label="Alt. Média"  value={avgHeight ? `${avgHeight} cm` : '—'} />
        <StatCard icon={Clock} label="Idade Média" value={avgAge ? `${avgAge} a` : '—'} />
      </div>

      {/* Radar Section */}
      <div className="mx-4 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono text-sm font-medium text-foreground">Radar do Time</h3>

          {/* Tab switcher */}
          <div className="flex bg-muted/30 rounded-lg p-0.5 border border-border/40">
            {(['tecnico', 'fisico'] as RadarTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all ${
                  activeTab === tab
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'tecnico' ? 'Técnico' : 'Físico'}
              </button>
            ))}
          </div>
        </div>

        {!hasData ? (
          <div className="card-surface neon-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-body text-sm">Sem dados de avaliação</p>
            <p className="text-muted-foreground font-mono text-[10px] mt-1">Cadastre atletas e realize avaliações</p>
          </div>
        ) : (
          <div className="card-surface neon-border rounded-xl p-4">
            {/* Big centered radar */}
            <div className="flex justify-center">
              <RadarChart
                labels={currentLabels}
                values={currentValues}
                size={280}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-border/30 my-4" />

            {/* Score list */}
            <div className="space-y-2">
              {currentAttrs.map((attr, i) => {
                const score = Math.round(currentValues[i]);
                return (
                  <div key={attr} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground flex-1">
                      {currentLabelMap[attr as keyof typeof currentLabelMap]}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${score}%`,
                          boxShadow: '0 0 4px hsl(var(--primary) / 0.4)',
                        }}
                      />
                    </div>
                    <span className={`font-mono text-sm font-bold w-8 text-right ${scoreColor(currentValues[i])}`}>
                      {score || '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="card-surface neon-border rounded-lg p-3 text-center">
      <Icon className="w-5 h-5 text-primary mx-auto mb-1" strokeWidth={1.5} />
      <p className="font-mono text-lg font-bold neon-text">{value}</p>
      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default TeamProfilePage;
