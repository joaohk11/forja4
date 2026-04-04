// src/pages/BackupPage.tsx
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useApp } from '@/lib/context';
import {
  Download,
  Upload,
  AlertTriangle,
  Cloud,
  CloudDownload,
  Loader2,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

interface CloudBackup {
  id: string;
  name: string;
  created_at: string;
  data: string;
}

const LOCAL_STORAGE_KEY = 'forja_backup_config';

const BackupPage = () => {
  const { exportData, importData } = useApp();

  const [config, setConfig] = useState<{ url: string; key: string }>({ url: '', key: '' });
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // --- Carrega credenciais do localStorage ---
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
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
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    setConfigSaved(true);
    setShowConfig(false);
    toast.success('Configuração salva');
    fetchCloudBackups();
  };

  const getClient = () => {
    if (!hasConfig) throw new Error('Supabase não configurado');
    return getSupabaseClient(config.url, config.key);
  };

  const fetchCloudBackups = async () => {
    if (!hasConfig) return;
    setLoadingCloud(true);
    try {
      const client = getClient();
      const { data, error } = await client
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCloudBackups(data || []);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao buscar backups na nuvem');
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (hasConfig) fetchCloudBackups();
  }, [configSaved]);

  const handleExportLocal = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forja-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado com sucesso');
  };

  const handleImportLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importData(text);
      if (success) toast.success('Backup importado com sucesso');
      else toast.error('Arquivo de backup inválido');
    };
    reader.readAsText(file);
  };

  const handleSaveCloud = async () => {
    if (!hasConfig) {
      setShowConfig(true);
      toast.error('Configure o Supabase antes de salvar');
      return;
    }
    setSavingCloud(true);
    try {
      const client = getClient();
      const json = exportData();
      const name = `FORJA ${new Date().toLocaleString('pt-BR')}`;

      const { error } = await client.from('backups').insert([{
        id: crypto.randomUUID(),
        name,
        data: json,
        created_at: new Date().toISOString()
      }]);

      if (error) throw error;
      toast.success('Backup salvo na nuvem');
      fetchCloudBackups();
    } catch (e) {
      console.error('Erro ao salvar backup na nuvem:', e);
      toast.error('Erro ao salvar backup na nuvem: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setSavingCloud(false);
    }
  };

  const handleLoadCloud = async (backup: CloudBackup) => {
    if (!window.confirm(`Restaurar backup "${backup.name}"? Os dados atuais serão substituídos.`))
      return;

    try {
      const client = getClient();
      const { data, error } = await client
        .from('backups')
        .select('data')
        .eq('id', backup.id)
        .single();

      if (error) throw error;
      if (!data?.data) {
        toast.error('Backup inválido ou vazio');
        return;
      }
      const success = importData(data.data);
      if (success) toast.success('Backup restaurado com sucesso');
      else toast.error('Erro ao restaurar backup');
    } catch (e) {
      console.error('Erro ao restaurar backup:', e);
      toast.error('Erro ao restaurar backup');
    }
  };

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Configuração Supabase */}
      <div className="card-surface rounded-lg p-4 mb-4 space-y-3">
        <p className="font-mono text-xs text-primary">Configuração Supabase</p>
        <input
          type="text"
          placeholder="Project URL (https://xxx.supabase.co)"
          value={config.url}
          onChange={(e) => setConfig(c => ({ ...c, url: e.target.value }))}
          className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
        />
        <input
          type="password"
          placeholder="Anon Public Key"
          value={config.key}
          onChange={(e) => setConfig(c => ({ ...c, key: e.target.value }))}
          className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
        />
        <button
          onClick={saveConfig}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/40 rounded text-xs font-mono text-primary hover:bg-primary/30 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Salvar Configuração
        </button>
      </div>

      {/* Botões Local e Nuvem */}
      <div className="space-y-4">
        <button onClick={handleExportLocal} className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left hover:neon-glow transition-all">
          <Download className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Exportar Backup Local</p>
            <p className="font-body text-[10px] text-muted-foreground">Salvar dados em arquivo JSON</p>
          </div>
        </button>

        <label className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left cursor-pointer hover:neon-glow transition-all block">
          <Upload className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Importar Backup Local</p>
            <p className="font-body text-[10px] text-muted-foreground">Restaurar dados de arquivo JSON</p>
          </div>
          <input type="file" accept=".json" onChange={handleImportLocal} className="hidden" />
        </label>

        <button
          onClick={handleSaveCloud}
          disabled={savingCloud}
          className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left hover:neon-glow transition-all disabled:opacity-60"
        >
          {savingCloud ? <Loader2 className="w-6 h-6 text-primary animate-spin" strokeWidth={1.5} /> : <Cloud className="w-6 h-6 text-primary" strokeWidth={1.5} />}
          <div>
            <p className="font-mono text-sm text-foreground">Salvar Backup na Nuvem</p>
            <p className="font-body text-[10px] text-muted-foreground">Salvar dados no Supabase</p>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BackupPage;
