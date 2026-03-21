import { getSupabaseClient } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { Download, Upload, AlertTriangle, Cloud, CloudDownload, Settings, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_CONFIG_KEY = 'forja_supabase_config';

interface SupabaseConfig {
  url: string;
  key: string;
}

interface CloudBackup {
  id: string;
  name: string;
  created_at: string;
  data: string;
}

const BackupPage = () => {
  const { exportData, importData } = useApp();

  const [config, setConfig] = useState<SupabaseConfig>({ url: '', key: '' });
  const [showConfig, setShowConfig] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        setConfigSaved(true);
      } catch {}
    }
  }, []);

  const hasConfig = configSaved && config.url && config.key;

  const saveConfig = () => {
    if (!config.url || !config.key) {
      toast.error('Preencha a URL e a chave do Supabase');
      return;
    }
    localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(config));
    setConfigSaved(true);
    setShowConfig(false);
    toast.success('Configuração salva');
    fetchCloudBackups();
  };

  // ✅ LISTAR BACKUPS (DIRETO DO SUPABASE)
  const fetchCloudBackups = async () => {
    if (!hasConfig) return;

    setLoadingCloud(true);
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCloudBackups(data || []);
    } catch (e) {
      toast.error('Erro ao listar backups na nuvem');
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (hasConfig) {
      fetchCloudBackups();
    }
  }, [configSaved]);

  // ✅ SALVAR BACKUP
  const handleSaveCloud = async () => {
    if (!hasConfig) {
      setShowConfig(true);
      return;
    }

    setSavingCloud(true);
    try {
      const supabase = getSupabaseClient();

      const json = exportData();

      const { error } = await supabase.from('backups').insert([
        {
          name: `FORJA ${new Date().toLocaleString('pt-BR')}`,
          data: json,
        },
      ]);

      if (error) throw error;

      toast.success('Backup salvo na nuvem');
      fetchCloudBackups();
    } catch (e) {
      toast.error('Erro ao salvar backup');
    } finally {
      setSavingCloud(false);
    }
  };

  // ✅ RESTAURAR BACKUP
  const handleLoadCloud = async (backup: CloudBackup) => {
    if (!window.confirm(`Restaurar backup "${backup.name}"?`)) return;

    const success = importData(backup.data);

    if (success) {
      toast.success('Backup restaurado com sucesso');
    } else {
      toast.error('Erro ao restaurar backup');
    }
  };

  // LOCAL (mantido igual)
  const handleExportLocal = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forja-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado');
  };

  const handleImportLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importData(text);

      if (success) toast.success('Backup importado');
      else toast.error('Arquivo inválido');
    };
    reader.readAsText(file);
  };

  return (
    <div className="px-4 py-6">
      <h2 className="font-mono text-sm mb-4">Backup</h2>

      <button onClick={() => setShowConfig(!showConfig)}>Configurar Supabase</button>

      {showConfig && (
        <div>
          <input
            placeholder="URL"
            value={config.url}
            onChange={e => setConfig(c => ({ ...c, url: e.target.value }))}
          />
          <input
            placeholder="KEY"
            value={config.key}
            onChange={e => setConfig(c => ({ ...c, key: e.target.value }))}
          />
          <button onClick={saveConfig}>Salvar</button>
        </div>
      )}

      <button onClick={handleExportLocal}>Exportar Local</button>
      <input type="file" onChange={handleImportLocal} />

      <button onClick={handleSaveCloud}>
        {savingCloud ? 'Salvando...' : 'Salvar na Nuvem'}
      </button>

      <button onClick={fetchCloudBackups}>
        {loadingCloud ? 'Carregando...' : 'Atualizar'}
      </button>

      <div>
        {cloudBackups.map(b => (
          <div key={b.id}>
            <p>{b.name}</p>
            <button onClick={() => handleLoadCloud(b)}>Restaurar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackupPage;
