import { supabase } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { Download, Upload, AlertTriangle, Cloud, CloudDownload, Settings, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CloudBackup {
  id: string;
  name: string;
  created_at: string;
  data: string;
}

const SUPABASE_CONFIG_KEY = 'supabase_config';
const LOCAL_STORAGE_KEY = 'forja_app_data';

const BackupPage = () => {
  const { exportData, importData } = useApp();

  const [config, setConfig] = useState<{ url: string; key: string }>({ url: '', key: '' });
  const [configSaved, setConfigSaved] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);

  // --- Load Supabase config from localStorage ---
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

  // --- Fetch backups from Supabase ---
  const fetchCloudBackups = async () => {
    if (!hasConfig) return;
    setLoadingCloud(true);
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCloudBackups(data || []);
    } catch {
      toast.error('Erro ao buscar backups na nuvem. Verifique suas credenciais.');
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (hasConfig) fetchCloudBackups();
  }, [configSaved]);

  // --- Export local backup ---
  const handleExportLocal = () => {
    const json = exportData();
    localStorage.setItem(LOCAL_STORAGE_KEY, json); // mantém localStorage
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forja-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup local salvo (localStorage + arquivo JSON)');
  };

  // --- Import local backup ---
  const handleImportLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      localStorage.setItem(LOCAL_STORAGE_KEY, text); // salva no localStorage
      const success = importData(text);
      if (success) toast.success('Backup importado com sucesso');
      else toast.error('Arquivo de backup inválido');
    };
    reader.readAsText(file);
  };

  // --- Save backup to Supabase ---
  const handleSaveCloud = async () => {
    if (!hasConfig) {
      setShowConfig(true);
      return;
    }
    setSavingCloud(true);
    try {
      const json = exportData();
      const name = `FORJA ${new Date().toLocaleString('pt-BR')}`;

      const { error } = await supabase
        .from('backups')
        .insert([{ name, data: json }]);

      if (error) throw error;

      toast.success('Backup salvo na nuvem');
      fetchCloudBackups();
    } catch {
      toast.error('Erro ao salvar backup na nuvem');
    } finally {
      setSavingCloud(false);
    }
  };

  // --- Load backup from Supabase ---
  const handleLoadCloud = async (backup: CloudBackup) => {
    if (!window.confirm(`Restaurar backup "${backup.name}"? Os dados atuais serão substituídos.`)) return;

    try {
      const { data, error } = await supabase
        .from('backups')
        .select('data')
        .eq('id', backup.id)
        .single();

      if (error) throw error;

      localStorage.setItem(LOCAL_STORAGE_KEY, data.data); // mantém localStorage
      const success = importData(data.data);
      if (success) toast.success('Backup restaurado com sucesso');
      else toast.error('Erro ao restaurar backup');
    } catch {
      toast.error('Erro ao restaurar backup');
    }
  };

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Supabase Config */}
      {showConfig && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Project URL (https://xxx.supabase.co)"
            value={config.url}
            onChange={e => setConfig(c => ({ ...c, url: e.target.value }))}
            className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="Anon Public Key"
            value={config.key}
            onChange={e => setConfig(c => ({ ...c, key: e.target.value }))}
            className="w-full bg-muted/30 border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-primary"
          />
          <button
            onClick={saveConfig}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 border border-primary/40 rounded text-xs font-mono text-primary hover:bg-primary/30 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Salvar Configuração
          </button>
        </div>
      )}

      {/* Local Export */}
      <button onClick={handleExportLocal} className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4">
        <Download className="w-6 h-6 text-primary" strokeWidth={1.5} />
        <p className="font-mono text-sm text-foreground">Exportar Backup Local</p>
      </button>

      {/* Local Import */}
      <label className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 cursor-pointer">
        <Upload className="w-6 h-6 text-primary" strokeWidth={1.5} />
        <input type="file" accept=".json" onChange={handleImportLocal} className="hidden" />
        <p className="font-mono text-sm text-foreground">Importar Backup Local</p>
      </label>

      {/* Cloud Save */}
      <button onClick={handleSaveCloud} disabled={savingCloud} className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4">
        {savingCloud ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Cloud className="w-6 h-6 text-primary" />}
        <p className="font-mono text-sm text-foreground">Salvar Backup na Nuvem</p>
      </button>

      {/* Cloud Backups List */}
      <div className="card-surface rounded-lg border border-border/40 overflow-hidden">
        {loadingCloud ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : cloudBackups.length === 0 ? (
          <div className="px-4 py-4 text-center text-muted-foreground">Nenhum backup na nuvem ainda.</div>
        ) : (
          <div className="divide-y divide-border/30">
            {cloudBackups.map(b => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-mono text-xs text-foreground">{b.name}</p>
                  <p className="font-body text-[10px] text-muted-foreground">{new Date(b.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={() => handleLoadCloud(b)} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                  <CloudDownload className="w-3.5 h-3.5" /> Restaurar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card-surface rounded-lg p-4 flex items-start gap-3 border border-status-partial/30">
        <AlertTriangle className="w-5 h-5 text-status-partial flex-shrink-0 mt-0.5" strokeWidth={1.5} />
        <div>
          <p className="font-mono text-xs text-foreground mb-1">Dica de Segurança</p>
          <p className="font-body text-[10px] text-muted-foreground">
            Faça backups regularmente. Os dados locais ficam no navegador e podem ser perdidos ao limpar o cache.
            Use o backup na nuvem (Supabase) para maior segurança.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BackupPage;
