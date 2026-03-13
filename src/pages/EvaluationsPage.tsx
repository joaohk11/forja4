import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { ArrowLeft, Dumbbell, Target, ChevronRight, Plus, Trash2, Edit2, Save, Users } from 'lucide-react';
import {
  PHYSICAL_ATTRIBUTES, TECHNICAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTE_LABELS, TECHNICAL_ATTRIBUTE_LABELS,
  PhysicalAttribute, TechnicalAttribute,
  MeasurementType, EvalRule, EvalTest,
  MEASUREMENT_TYPE_LABELS, convertToScore, POSITION_LABELS,
} from '@/lib/types';

type View = 'main' | 'physical' | 'technical' | 'attribute' | 'batch';

const EvaluationsPage = () => {
  const navigate = useNavigate();
  const { data, activeTeamId, addEvalTest, updateEvalTest, deleteEvalTest, addEvalResult } = useApp();

  const [view, setView] = useState<View>('main');
  const [selectedCategory, setSelectedCategory] = useState<'physical' | 'technical'>('physical');
  const [selectedAttr, setSelectedAttr] = useState<string>('');
  const [showTestForm, setShowTestForm] = useState(false);
  const [editingTest, setEditingTest] = useState<EvalTest | null>(null);
  const [showEvalForm, setShowEvalForm] = useState<string | null>(null);

  // Batch evaluation state
  const [batchTestId, setBatchTestId] = useState<string | null>(null);
  const [batchValues, setBatchValues] = useState<Record<string, string>>({});

  const [testForm, setTestForm] = useState({
    name: '',
    measurementType: 'repeticao' as MeasurementType,
    maxValue: 100,
    rule: 'maior_melhor' as EvalRule,
  });

  const [evalForm, setEvalForm] = useState({
    athleteId: '',
    rawValue: 0,
  });

  const teamAthletes = data.athletes.filter(a => a.teamId === activeTeamId).sort((a, b) => a.number - b.number);
  const testsForAttr = (data.evalTests || []).filter(t => t.attribute === selectedAttr && t.category === selectedCategory);

  const handleOpenCategory = (cat: 'physical' | 'technical') => {
    setSelectedCategory(cat);
    setView(cat);
  };

  const handleOpenAttr = (attr: string) => {
    setSelectedAttr(attr);
    setView('attribute');
  };

  const handleBack = () => {
    if (view === 'batch') setView('attribute');
    else if (view === 'attribute') setView(selectedCategory);
    else if (view === 'physical' || view === 'technical') setView('main');
    else navigate(-1);
  };

  const resetTestForm = () => {
    setTestForm({ name: '', measurementType: 'repeticao', maxValue: 100, rule: 'maior_melhor' });
    setEditingTest(null);
    setShowTestForm(false);
  };

  const handleSaveTest = () => {
    if (!testForm.name.trim()) return;
    if (editingTest) {
      updateEvalTest({ ...editingTest, ...testForm });
    } else {
      addEvalTest({
        ...testForm,
        attribute: selectedAttr as PhysicalAttribute | TechnicalAttribute,
        category: selectedCategory,
      });
    }
    resetTestForm();
  };

  const handleSaveEval = () => {
    if (!evalForm.athleteId || !showEvalForm) return;
    const test = (data.evalTests || []).find(t => t.id === showEvalForm);
    if (!test) return;
    const rawVal = parseRawValue(evalForm.rawValue, test.measurementType);
    const score = convertToScore(rawVal, test.maxValue, test.rule);
    addEvalResult({
      athleteId: evalForm.athleteId,
      testId: test.id,
      rawValue: rawVal,
      convertedScore: score,
      date: new Date().toISOString().slice(0, 10),
    });
    setShowEvalForm(null);
    setEvalForm({ athleteId: '', rawValue: 0 });
  };

  // Batch evaluation
  const handleOpenBatch = (testId: string) => {
    setBatchTestId(testId);
    const vals: Record<string, string> = {};
    teamAthletes.forEach(a => { vals[a.id] = ''; });
    setBatchValues(vals);
    setView('batch');
  };

  const handleSaveBatch = () => {
    if (!batchTestId) return;
    const test = (data.evalTests || []).find(t => t.id === batchTestId);
    if (!test) return;
    const date = new Date().toISOString().slice(0, 10);

    Object.entries(batchValues).forEach(([athleteId, val]) => {
      if (!val || val.trim() === '') return;
      const rawVal = parseRawValue(parseFloat(val) || 0, test.measurementType);
      const score = convertToScore(rawVal, test.maxValue, test.rule);
      addEvalResult({
        athleteId,
        testId: test.id,
        rawValue: rawVal,
        convertedScore: score,
        date,
      });
    });
    setView('attribute');
  };

  const parseRawValue = (val: number, type: MeasurementType): number => {
    return val;
  };

  const formatRawValue = (val: number, type: MeasurementType): string => {
    if (type === 'tempo') {
      const mins = Math.floor(val / 60);
      const secs = Math.round(val % 60);
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    if (type === 'distancia') {
      return `${val} cm`;
    }
    return String(val);
  };

  const getLastEvalDate = (athleteId: string, testId: string): string | null => {
    const results = (data.evalResults || []).filter(r => r.athleteId === athleteId && r.testId === testId);
    if (results.length === 0) return null;
    return results.sort((a, b) => b.date.localeCompare(a.date))[0].date;
  };

  const attrs = selectedCategory === 'physical' ? PHYSICAL_ATTRIBUTES : TECHNICAL_ATTRIBUTES;
  const attrLabels = selectedCategory === 'physical' ? PHYSICAL_ATTRIBUTE_LABELS : TECHNICAL_ATTRIBUTE_LABELS;

  // Batch view
  if (view === 'batch' && batchTestId) {
    const test = (data.evalTests || []).find(t => t.id === batchTestId);
    if (!test) return null;

    return (
      <div className="px-4 py-6">
        <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-2">{test.name}</h2>
        <p className="font-body text-[10px] text-muted-foreground mb-4">
          {MEASUREMENT_TYPE_LABELS[test.measurementType]} · Máx: {test.measurementType === 'tempo' ? formatRawValue(test.maxValue, 'tempo') : test.measurementType === 'distancia' ? `${test.maxValue} cm` : test.maxValue}
        </p>

        <div className="card-surface neon-border rounded-lg p-4 space-y-3">
          {teamAthletes.map(a => {
            const lastDate = getLastEvalDate(a.id, test.id);
            return (
              <div key={a.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary text-[10px]">#{a.number}</span>
                    <span className="font-mono text-xs text-foreground truncate">{a.name}</span>
                  </div>
                  {lastDate && (
                    <p className="font-mono text-[8px] text-muted-foreground">Última: {lastDate}</p>
                  )}
                </div>
                <div className="w-24">
                  {test.measurementType === 'tempo' ? (
                    <input
                      type="text"
                      value={batchValues[a.id] || ''}
                      onChange={e => setBatchValues({ ...batchValues, [a.id]: e.target.value })}
                      placeholder="MM:SS"
                      className="w-full bg-background border border-border rounded px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none text-center"
                    />
                  ) : (
                    <input
                      type="number"
                      step={test.measurementType === 'distancia' ? '1' : '0.1'}
                      value={batchValues[a.id] || ''}
                      onChange={e => setBatchValues({ ...batchValues, [a.id]: e.target.value })}
                      placeholder={test.measurementType === 'distancia' ? 'cm' : '0'}
                      className="w-full bg-background border border-border rounded px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none text-center"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSaveBatch}
          className="w-full bg-primary text-primary-foreground font-mono text-sm py-3 rounded mt-4 hover:neon-glow transition-all"
        >
          Salvar Avaliações
        </button>
      </div>
    );
  }

  // Main view
  if (view === 'main') {
    return (
      <div className="px-4 py-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-6">Avaliações</h2>
        <div className="space-y-3">
          <button
            onClick={() => handleOpenCategory('physical')}
            className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-mono text-sm font-medium text-foreground">Avaliação Física</h3>
              <p className="font-body text-[10px] text-muted-foreground">Força, Explosão, Agilidade, Velocidade, Resistência, Reflexo</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>

          <button
            onClick={() => handleOpenCategory('technical')}
            className="w-full card-surface neon-border rounded-lg p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-mono text-sm font-medium text-foreground">Avaliação Técnica</h3>
              <p className="font-body text-[10px] text-muted-foreground">Bloqueio, Saque, Ataque, Defesa, Recepção, Cobertura, Leitura</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  // Attribute list view
  if (view === 'physical' || view === 'technical') {
    return (
      <div className="px-4 py-6">
        <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
        </button>
        <h2 className="font-mono text-lg font-bold neon-text mb-6">
          {view === 'physical' ? 'Avaliação Física' : 'Avaliação Técnica'}
        </h2>
        <div className="space-y-2">
          {attrs.map(attr => {
            const tests = (data.evalTests || []).filter(t => t.attribute === attr && t.category === selectedCategory);
            return (
              <button
                key={attr}
                onClick={() => handleOpenAttr(attr)}
                className="w-full card-surface neon-border rounded-md p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <div className="text-left">
                  <h3 className="font-mono text-sm text-foreground">{(attrLabels as any)[attr]}</h3>
                  <p className="font-body text-[10px] text-muted-foreground">{tests.length} teste(s)</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Attribute detail with tests
  return (
    <div className="px-4 py-6">
      <button onClick={handleBack} className="flex items-center gap-1 text-muted-foreground hover:text-primary font-mono text-xs mb-4">
        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Voltar
      </button>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-lg font-bold neon-text">
          {(selectedCategory === 'physical' ? PHYSICAL_ATTRIBUTE_LABELS : TECHNICAL_ATTRIBUTE_LABELS)[selectedAttr as any]}
        </h2>
        <button
          onClick={() => { resetTestForm(); setShowTestForm(true); }}
          className="flex items-center gap-1 text-primary font-mono text-xs hover:neon-text transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} /> Novo Teste
        </button>
      </div>

      {/* Test form */}
      {showTestForm && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <input
            value={testForm.name}
            onChange={e => setTestForm({ ...testForm, name: e.target.value })}
            placeholder="Nome do teste"
            className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">Tipo de medição</label>
              <select
                value={testForm.measurementType}
                onChange={e => setTestForm({ ...testForm, measurementType: e.target.value as MeasurementType })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {(Object.entries(MEASUREMENT_TYPE_LABELS) as [MeasurementType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-mono text-[10px] text-muted-foreground">
                Valor máximo {testForm.measurementType === 'distancia' ? '(cm)' : testForm.measurementType === 'tempo' ? '(seg)' : ''}
              </label>
              <input
                type="number" min={1} value={testForm.maxValue}
                onChange={e => setTestForm({ ...testForm, maxValue: parseFloat(e.target.value) || 1 })}
                className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Regra</label>
            <select
              value={testForm.rule}
              onChange={e => setTestForm({ ...testForm, rule: e.target.value as EvalRule })}
              className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="maior_melhor">Maior é melhor</option>
              <option value="menor_melhor">Menor é melhor</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveTest} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow transition-all">
              <Save className="w-3 h-3 inline mr-1" /> {editingTest ? 'Salvar' : 'Criar'}
            </button>
            <button onClick={resetTestForm} className="px-4 border border-border text-muted-foreground font-mono text-xs py-2 rounded hover:border-primary/50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Evaluation form */}
      {showEvalForm && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <h4 className="font-mono text-xs text-primary">Registrar Resultado</h4>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Atleta</label>
            <select
              value={evalForm.athleteId}
              onChange={e => setEvalForm({ ...evalForm, athleteId: e.target.value })}
              className="w-full bg-background border border-border rounded px-3 py-2 font-body text-sm text-foreground focus:border-primary focus:outline-none"
            >
              <option value="">Selecionar atleta</option>
              {teamAthletes.map(a => (
                <option key={a.id} value={a.id}>#{a.number} {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] text-muted-foreground">Resultado</label>
            <input
              type="number" step="0.1" value={evalForm.rawValue}
              onChange={e => setEvalForm({ ...evalForm, rawValue: parseFloat(e.target.value) || 0 })}
              className="w-full bg-background border border-border rounded px-3 py-2 font-mono text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveEval} className="flex-1 bg-primary text-primary-foreground font-mono text-xs py-2 rounded hover:neon-glow transition-all">
              Salvar Resultado
            </button>
            <button onClick={() => { setShowEvalForm(null); setEvalForm({ athleteId: '', rawValue: 0 }); }} className="px-4 border border-border text-muted-foreground font-mono text-xs py-2 rounded hover:border-primary/50">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tests list */}
      <div className="space-y-2">
        {testsForAttr.length === 0 && (
          <p className="text-center text-muted-foreground font-body text-sm py-8">Nenhum teste cadastrado</p>
        )}
        {testsForAttr.map(test => {
          const results = (data.evalResults || []).filter(r => r.testId === test.id);
          return (
            <div key={test.id} className="card-surface neon-border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-mono text-sm text-foreground">{test.name}</h4>
                  <p className="font-body text-[10px] text-muted-foreground">
                    {MEASUREMENT_TYPE_LABELS[test.measurementType]} · Máx: {test.measurementType === 'distancia' ? `${test.maxValue} cm` : test.measurementType === 'tempo' ? formatRawValue(test.maxValue, 'tempo') : test.maxValue} · {test.rule === 'maior_melhor' ? '↑ Maior melhor' : '↓ Menor melhor'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpenBatch(test.id)}
                    className="p-1.5 text-primary hover:neon-text" title="Avaliar todos"
                  >
                    <Users className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => { setShowEvalForm(test.id); setEvalForm({ athleteId: '', rawValue: 0 }); }}
                    className="p-1.5 text-primary hover:neon-text" title="Avaliar individual"
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => { setTestForm({ name: test.name, measurementType: test.measurementType, maxValue: test.maxValue, rule: test.rule }); setEditingTest(test); setShowTestForm(true); }}
                    className="p-1.5 text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => deleteEvalTest(test.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              {/* Recent results */}
              {results.length > 0 && (
                <div className="mt-2 border-t border-border pt-2 space-y-1">
                  {results.slice(-5).reverse().map(r => {
                    const athlete = data.athletes.find(a => a.id === r.athleteId);
                    return (
                      <div key={r.id} className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">{athlete?.name || '?'}</span>
                        <span className="text-foreground">
                          {formatRawValue(r.rawValue, test.measurementType)} → <span className="text-primary">{r.convertedScore}</span>
                        </span>
                        <span className="text-muted-foreground">{r.date}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvaluationsPage;
