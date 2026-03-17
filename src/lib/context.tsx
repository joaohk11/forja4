import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AppData, Athlete, Training, Macrocycle, Mesocycle, Microcycle, EvalTest, EvalResult, TrainingSuggestion, SuggestionStatus } from './types';
import { loadData, saveData, generateId } from './store';

interface AppContextType {
  data: AppData;
  activeTeamId: string;
  setActiveTeam: (id: string) => void;
  // Athletes
  addAthlete: (athlete: Omit<Athlete, 'id'>) => void;
  updateAthlete: (athlete: Athlete) => void;
  deleteAthlete: (id: string) => void;
  // Trainings
  addTraining: (training: Omit<Training, 'id'>) => void;
  updateTraining: (training: Training) => void;
  deleteTraining: (id: string) => void;
  // Macrocycles
  addMacrocycle: (m: Omit<Macrocycle, 'id'>) => void;
  updateMacrocycle: (m: Macrocycle) => void;
  deleteMacrocycle: (id: string) => void;
  // Mesocycles
  addMesocycle: (m: Omit<Mesocycle, 'id'>) => void;
  deleteMesocycle: (id: string) => void;
  // Microcycles
  addMicrocycle: (m: Omit<Microcycle, 'id'>) => void;
  deleteMicrocycle: (id: string) => void;
  // Eval Tests
  addEvalTest: (t: Omit<EvalTest, 'id'>) => void;
  updateEvalTest: (t: EvalTest) => void;
  deleteEvalTest: (id: string) => void;
  // Eval Results
  addEvalResult: (r: Omit<EvalResult, 'id'>) => void;
  deleteEvalResult: (id: string) => void;
  // Training Suggestions
  addTrainingSuggestion: (s: Omit<TrainingSuggestion, 'id' | 'createdAt' | 'status'>) => void;
  updateSuggestionStatus: (id: string, status: SuggestionStatus, editedTraining?: Training) => void;
  deleteTrainingSuggestion: (id: string) => void;
  // Backup
  exportData: () => string;
  importData: (json: string) => boolean;
  // Team
  updateTeamName: (id: string, name: string) => void;
  updateTeamPhoto: (id: string, photo: string | undefined) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);

  useEffect(() => {
    saveData(data);
  }, [data]);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    setData(prev => fn(prev));
  }, []);

  const activeTeamId = data.activeTeamId;
  const setActiveTeam = (id: string) => update(d => ({ ...d, activeTeamId: id }));

  const addAthlete = (a: Omit<Athlete, 'id'>) => {
    const teamAthletes = data.athletes.filter(x => x.teamId === a.teamId);
    if (teamAthletes.length >= 25) return;
    update(d => ({ ...d, athletes: [...d.athletes, { ...a, id: generateId() }] }));
  };

  const updateAthlete = (a: Athlete) => update(d => ({
    ...d, athletes: d.athletes.map(x => x.id === a.id ? a : x)
  }));

  const deleteAthlete = (id: string) => update(d => ({
    ...d,
    athletes: d.athletes.filter(x => x.id !== id),
    evalResults: d.evalResults.filter(r => r.athleteId !== id),
  }));

  const addTraining = (t: Omit<Training, 'id'>) => update(d => ({
    ...d, trainings: [...d.trainings, { ...t, id: generateId() }]
  }));

  const updateTraining = (t: Training) => update(d => ({
    ...d, trainings: d.trainings.map(x => x.id === t.id ? t : x)
  }));

  const deleteTraining = (id: string) => update(d => ({
    ...d, trainings: d.trainings.filter(x => x.id !== id)
  }));

  const addMacrocycle = (m: Omit<Macrocycle, 'id'>) => update(d => ({
    ...d, macrocycles: [...d.macrocycles, { ...m, id: generateId() }]
  }));

  const updateMacrocycle = (m: Macrocycle) => update(d => ({
    ...d, macrocycles: d.macrocycles.map(x => x.id === m.id ? m : x)
  }));

  const deleteMacrocycle = (id: string) => update(d => {
    const mesoIds = d.mesocycles.filter(m => m.macrocycleId === id).map(m => m.id);
    const microIds = d.microcycles.filter(m => mesoIds.includes(m.mesocycleId)).map(m => m.id);
    return {
      ...d,
      macrocycles: d.macrocycles.filter(x => x.id !== id),
      mesocycles: d.mesocycles.filter(x => x.macrocycleId !== id),
      microcycles: d.microcycles.filter(x => !microIds.includes(x.id)),
    };
  });

  const addMesocycle = (m: Omit<Mesocycle, 'id'>) => update(d => ({
    ...d, mesocycles: [...d.mesocycles, { ...m, id: generateId() }]
  }));

  const deleteMesocycle = (id: string) => update(d => {
    const microIds = d.microcycles.filter(m => m.mesocycleId === id).map(m => m.id);
    return {
      ...d,
      mesocycles: d.mesocycles.filter(x => x.id !== id),
      microcycles: d.microcycles.filter(x => !microIds.includes(x.id)),
    };
  });

  const addMicrocycle = (m: Omit<Microcycle, 'id'>) => update(d => ({
    ...d, microcycles: [...d.microcycles, { ...m, id: generateId() }]
  }));

  const deleteMicrocycle = (id: string) => update(d => ({
    ...d, microcycles: d.microcycles.filter(x => x.id !== id)
  }));

  // Eval Tests
  const addEvalTest = (t: Omit<EvalTest, 'id'>) => update(d => ({
    ...d, evalTests: [...d.evalTests, { ...t, id: generateId() }]
  }));

  const updateEvalTest = (t: EvalTest) => update(d => ({
    ...d, evalTests: d.evalTests.map(x => x.id === t.id ? t : x)
  }));

  const deleteEvalTest = (id: string) => update(d => ({
    ...d,
    evalTests: d.evalTests.filter(x => x.id !== id),
    evalResults: d.evalResults.filter(r => r.testId !== id),
  }));

  // Eval Results
  const addEvalResult = (r: Omit<EvalResult, 'id'>) => update(d => ({
    ...d, evalResults: [...d.evalResults, { ...r, id: generateId() }]
  }));

  const deleteEvalResult = (id: string) => update(d => ({
    ...d, evalResults: d.evalResults.filter(x => x.id !== id)
  }));

  // Training Suggestions
  const addTrainingSuggestion = (s: Omit<TrainingSuggestion, 'id' | 'createdAt' | 'status'>) => update(d => ({
    ...d,
    trainingSuggestions: [
      ...(d.trainingSuggestions || []),
      { ...s, id: generateId(), status: 'pending', createdAt: new Date().toISOString() },
    ],
  }));

  const updateSuggestionStatus = (id: string, status: SuggestionStatus, editedTraining?: Training) => update(d => {
    const suggestions = (d.trainingSuggestions || []).map(s =>
      s.id === id ? { ...s, status } : s
    );
    let trainings = d.trainings;
    if (status === 'approved') {
      const suggestion = (d.trainingSuggestions || []).find(s => s.id === id);
      if (suggestion) {
        if (editedTraining) {
          const exists = trainings.some(t => t.id === editedTraining.id);
          if (exists) {
            trainings = trainings.map(t => t.id === editedTraining.id ? editedTraining : t);
          } else {
            trainings = [...trainings, editedTraining];
          }
        } else if (suggestion.proposedChange?.newTraining) {
          trainings = [...trainings, { ...suggestion.proposedChange.newTraining, id: generateId() }];
        } else if (suggestion.proposedChange?.editedModule && suggestion.proposedChange.moduleId) {
          trainings = trainings.map(t => {
            if (t.id !== suggestion.trainingId) return t;
            return {
              ...t,
              modules: t.modules.map(m =>
                m.id === suggestion.proposedChange!.moduleId
                  ? { ...m, ...suggestion.proposedChange!.editedModule }
                  : m
              ),
            };
          });
        } else if (suggestion.proposedChange?.newModule) {
          trainings = trainings.map(t => {
            if (t.id !== suggestion.trainingId) return t;
            return { ...t, modules: [...t.modules, suggestion.proposedChange!.newModule!] };
          });
        }
      }
    }
    return { ...d, trainingSuggestions: suggestions, trainings };
  });

  const deleteTrainingSuggestion = (id: string) => update(d => ({
    ...d,
    trainingSuggestions: (d.trainingSuggestions || []).filter(s => s.id !== id),
  }));

  const exportDataFn = () => JSON.stringify(data, null, 2);

  const importData = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.teams) {
        setData({ ...data, ...parsed });
        return true;
      }
    } catch {}
    return false;
  };

  const updateTeamName = (id: string, name: string) => update(d => ({
    ...d, teams: d.teams.map(t => t.id === id ? { ...t, name } : t)
  }));

  const updateTeamPhoto = (id: string, photo: string | undefined) => update(d => ({
    ...d, teams: d.teams.map(t => t.id === id ? { ...t, photo } : t)
  }));

  return (
    <AppContext.Provider value={{
      data, activeTeamId, setActiveTeam,
      addAthlete, updateAthlete, deleteAthlete,
      addTraining, updateTraining, deleteTraining,
      addMacrocycle, updateMacrocycle, deleteMacrocycle,
      addMesocycle, deleteMesocycle,
      addMicrocycle, deleteMicrocycle,
      addEvalTest, updateEvalTest, deleteEvalTest,
      addEvalResult, deleteEvalResult,
      addTrainingSuggestion, updateSuggestionStatus, deleteTrainingSuggestion,
      exportData: exportDataFn, importData, updateTeamName, updateTeamPhoto,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
