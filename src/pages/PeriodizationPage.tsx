import { useState, useMemo } from 'react';
import { useApp } from '@/lib/context';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { format, differenceInWeeks, addWeeks, parseISO, isWithinInterval } from 'date-fns';

const PeriodizationPage = () => {
  const { data, activeTeamId, addMacrocycle, addMesocycle } = useApp();
  const [showMacroForm, setShowMacroForm] = useState(false);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);
  const [showMesoForm, setShowMesoForm] = useState<string | null>(null);

  const macros = data.macrocycles.filter(m => m.teamId === activeTeamId);

  const [macroForm, setMacroForm] = useState({ name: '', startDate: '', type: '6months' as '6months' | '1year' });
  const [mesoForm, setMesoForm] = useState({ name: '', startDate: '', endDate: '', weeks: 4 });

  const handleAddMacro = () => {
    if (!macroForm.name || !macroForm.startDate) return;
    const startDate = new Date(macroForm.startDate);
    const months = macroForm.type === '6months' ? 6 : 12;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);
    addMacrocycle({
      teamId: activeTeamId,
      name: macroForm.name,
      startDate: macroForm.startDate,
      endDate: format(endDate, 'yyyy-MM-dd'),
      type: macroForm.type,
    });
    setMacroForm({ name: '', startDate: '', type: '6months' });
    setShowMacroForm(false);
  };

  const handleAddMeso = (macroId: string) => {
    if (!mesoForm.name || !mesoForm.startDate || !mesoForm.endDate) return;
    const start = parseISO(mesoForm.startDate);
    const end = parseISO(mesoForm.endDate);
    const weeks = Math.max(1, differenceInWeeks(end, start));
    addMesocycle({
      macrocycleId: macroId,
      name: mesoForm.name,
      startDate: mesoForm.startDate,
      endDate: mesoForm.endDate,
      weeks,
    });
    setMesoForm({ name: '', startDate: '', endDate: '', weeks: 4 });
    setShowMesoForm(null);
  };

  // Get trainings for a mesocycle, organized by week
  const getWeeksForMeso = (mesoStartDate: string, mesoEndDate: string) => {
    const start = parseISO(mesoStartDate);
    const end = parseISO(mesoEndDate);
    const totalWeeks = Math.max(1, differenceInWeeks(end, start));
    const weeks: { weekNum: number; startDate: Date; endDate: Date; trainings: typeof data.trainings }[] = [];

    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = addWeeks(start, i);
      const weekEnd = addWeeks(start, i + 1);
      const weekTrainings = data.trainings.filter(t => {
        if (t.teamId !== activeTeamId) return false;
        const tDate = parseISO(t.date);
        return isWithinInterval(tDate, { start: weekStart, end: weekEnd });
      });
      weeks.push({
        weekNum: i + 1,
        startDate: weekStart,
        endDate: weekEnd,
        trainings: weekTrainings,
      });
    }
    return weeks;
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-sm font-medium">Periodização</h2>
        <button onClick={() => setShowMacroForm(true)} className="flex items-center gap-1 text-primary font-mono text-xs">
          <Plus className="w-4 h-4" strokeWidth={1.5} /> Macrociclo
        </button>
      </div>

      {showMacroForm && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <input value={macroForm.name} onChange={e => setMacroForm({ ...macroForm, name: e.target.value })} placeholder="Nome do macrociclo"
            className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Início</label>
              <input type="date" value={macroForm.startDate} onChange={e => setMacroForm({ ...macroForm, startDate: e.target.value })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Duração</label>
              <select value={macroForm.type} onChange={e => setMacroForm({ ...macroForm, type: e.target.value as any })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none">
                <option value="6months">6 meses</option>
                <option value="1year">1 ano</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddMacro} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded">Criar</button>
            <button onClick={() => setShowMacroForm(false)} className="px-4 border border-border text-muted-foreground font-mono text-xs py-2 rounded">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {macros.map(macro => {
          const expanded = expandedMacro === macro.id;
          const mesos = data.mesocycles.filter(m => m.macrocycleId === macro.id);
          const totalWeeks = differenceInWeeks(parseISO(macro.endDate), parseISO(macro.startDate));
          return (
            <div key={macro.id} className="card-surface neon-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedMacro(expanded ? null : macro.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                {expanded ? <ChevronDown className="w-4 h-4 text-primary" strokeWidth={1.5} /> : <ChevronRight className="w-4 h-4 text-primary" strokeWidth={1.5} />}
                <div className="flex-1">
                  <p className="font-mono text-sm text-foreground">{macro.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {format(new Date(macro.startDate), 'dd/MM/yyyy')} — {format(new Date(macro.endDate), 'dd/MM/yyyy')} · {totalWeeks} semanas
                  </p>
                </div>
              </button>
              {expanded && (
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">Mesociclos</span>
                    <button onClick={() => setShowMesoForm(macro.id)} className="text-primary font-mono text-[10px]">
                      <Plus className="w-3 h-3 inline" strokeWidth={1.5} /> Adicionar
                    </button>
                  </div>
                  {showMesoForm === macro.id && (
                    <div className="bg-background border border-border rounded p-3 space-y-2">
                      <input value={mesoForm.name} onChange={e => setMesoForm({ ...mesoForm, name: e.target.value })} placeholder="Nome"
                        className="w-full bg-muted border border-border rounded px-2 py-1.5 font-body text-xs text-foreground focus:border-primary focus:outline-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="font-mono text-[9px] text-muted-foreground">Início</label>
                          <input type="date" value={mesoForm.startDate} onChange={e => setMesoForm({ ...mesoForm, startDate: e.target.value })}
                            className="w-full bg-muted border border-border rounded px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none" />
                        </div>
                        <div>
                          <label className="font-mono text-[9px] text-muted-foreground">Fim</label>
                          <input type="date" value={mesoForm.endDate} onChange={e => setMesoForm({ ...mesoForm, endDate: e.target.value })}
                            className="w-full bg-muted border border-border rounded px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAddMeso(macro.id)} className="flex-1 bg-primary text-primary-foreground font-mono text-[10px] py-1.5 rounded">Criar</button>
                        <button onClick={() => setShowMesoForm(null)} className="px-3 border border-border text-muted-foreground font-mono text-[10px] py-1.5 rounded">Cancelar</button>
                      </div>
                    </div>
                  )}
                  {mesos.map(meso => {
                    const weeks = getWeeksForMeso(meso.startDate, meso.endDate);
                    return (
                      <div key={meso.id} className="bg-background border border-border rounded p-3">
                        <p className="font-mono text-xs text-foreground">{meso.name}</p>
                        <p className="font-mono text-[10px] text-muted-foreground mb-2">
                          {format(new Date(meso.startDate), 'dd/MM')} — {format(new Date(meso.endDate), 'dd/MM')} · {weeks.length} semanas
                        </p>
                        <div className="space-y-1">
                          {weeks.map(week => (
                            <div key={week.weekNum} className="flex items-center gap-2 px-2 py-1 rounded bg-muted/30">
                              <span className="font-mono text-[9px] text-primary w-16">Sem. {week.weekNum}</span>
                              <span className="font-mono text-[9px] text-muted-foreground flex-1">
                                {format(week.startDate, 'dd/MM')} - {format(week.endDate, 'dd/MM')}
                              </span>
                              <span className="font-mono text-[9px] text-foreground">
                                {week.trainings.length} treino{week.trainings.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {mesos.length === 0 && !showMesoForm && (
                    <p className="text-muted-foreground font-body text-[10px] text-center py-2">Nenhum mesociclo</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {macros.length === 0 && (
          <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum macrociclo criado</p>
        )}
      </div>
    </div>
  );
};

export default PeriodizationPage;
