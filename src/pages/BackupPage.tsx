import { getSupabaseClient } from '../lib/supabaseClient';
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { Download, Upload, AlertTriangle, Cloud, CloudDownload, Settings, Check, Loader2, Trash2 } from 'lucide-react';
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
    fetchCloudBackups({ url: config.url, key: config.key });
  };

  const fetchCloudBackups = async (cfg = config) => {
    if (!cfg.url || !cfg.key) return;
    setLoadingCloud(true);
    try {
      const res = await fetch(
        `/api/backup/list?supabaseUrl=${encodeURIComponent(cfg.url)}&supabaseKey=${encodeURIComponent(cfg.key)}`
      );
      if (!res.ok) throw new Error('Erro ao listar backups');
      const data = await res.json();
      setCloudBackups(data || []);
    } catch (e) {
      toast.error('Erro ao listar backups na nuvem. Verifique suas credenciais Supabase.');
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    if (configSaved && config.url && config.key) {
      fetchCloudBackups();
    }
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
      if (success) {
        toast.success('Backup importado com sucesso');
      } else {
        toast.error('Arquivo de backup inválido');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCloud = async () => {
    if (!hasConfig) {
      setShowConfig(true);
      return;
    }
    setSavingCloud(true);
    try {
      const json = exportData();
      const name = `FORJA ${new Date().toLocaleString('pt-BR')}`;
      const res = await fetch('/api/backup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: json, name, supabaseUrl: config.url, supabaseKey: config.key }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao salvar');
      toast.success('Backup salvo na nuvem');
      fetchCloudBackups();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar backup na nuvem');
    } finally {
      setSavingCloud(false);
    }
  };

  const handleLoadCloud = async (backup: CloudBackup) => {
    if (!window.confirm(`Restaurar backup "${backup.name}"? Os dados atuais serão substituídos.`)) return;
    try {
      const res = await fetch(
        `/api/backup/load/${backup.id}?supabaseUrl=${encodeURIComponent(config.url)}&supabaseKey=${encodeURIComponent(config.key)}`
      );
    let result: any = null;
try {
  const text = await res.text(); // pega como string
  result = text ? JSON.parse(text) : null; // tenta converter se não vazio
} catch (e) {
  console.error('Erro ao parsear JSON do fetch:', e);
  toast.error('Erro ao processar backup da nuvem');
  return;
}
      if (!res.ok) throw new Error(result.error || 'Erro ao carregar');
      const success = importData(result.data);
      if (success) {
        toast.success('Backup restaurado com sucesso');
      } else {
        toast.error('Dados do backup inválidos');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao restaurar backup');
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-mono text-sm font-medium">Backup</h2>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Configurar Supabase
        </button>
      </div>

      {/* Supabase Config Panel */}
      {showConfig && (
        <div className="card-surface neon-border rounded-lg p-4 mb-4 space-y-3">
          <p className="font-mono text-xs text-primary">Configuração Supabase</p>
          <p className="font-body text-[10px] text-muted-foreground">
            Para usar backup na nuvem, crie um projeto em{' '}
            <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              supabase.com
            </a>{' '}
            e crie uma tabela chamada <code className="bg-muted px-1 rounded">backups</code> com as colunas:
            <code className="bg-muted px-1 rounded ml-1">id (uuid, pk)</code>,{' '}
            <code className="bg-muted px-1 rounded">name (text)</code>,{' '}
            <code className="bg-muted px-1 rounded">data (text)</code>,{' '}
            <code className="bg-muted px-1 rounded">created_at (timestamptz)</code>.
          </p>
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
            <Check className="w-3.5 h-3.5" />
            Salvar Configuração
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* Local Export */}
        <button
          onClick={handleExportLocal}
          className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left hover:neon-glow transition-all"
        >
          <Download className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Exportar Backup Local</p>
            <p className="font-body text-[10px] text-muted-foreground">Salvar dados em arquivo JSON</p>
          </div>
        </button>

        {/* Local Import */}
        <label className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left cursor-pointer hover:neon-glow transition-all block">
          <Upload className="w-6 h-6 text-primary" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Importar Backup Local</p>
            <p className="font-body text-[10px] text-muted-foreground">Restaurar dados de arquivo JSON</p>
          </div>
          <input type="file" accept=".json" onChange={handleImportLocal} className="hidden" />
        </label>

        {/* Cloud Backup Save */}
        <button
          onClick={handleSaveCloud}
          disabled={savingCloud}
          className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left hover:neon-glow transition-all disabled:opacity-60"
        >
          {savingCloud ? (
            <Loader2 className="w-6 h-6 text-primary animate-spin" strokeWidth={1.5} />
          ) : (
            <Cloud className="w-6 h-6 text-primary" strokeWidth={1.5} />
          )}
          <div>
            <p className="font-mono text-sm text-foreground">Salvar Backup na Nuvem</p>
            <p className="font-body text-[10px] text-muted-foreground">
              {hasConfig ? 'Salvar dados no Supabase' : 'Configure o Supabase para usar'}
            </p>
          </div>
        </button>

        {/* Cloud Backups List */}
        {hasConfig && (
          <div className="card-surface rounded-lg border border-border/40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <p className="font-mono text-xs text-foreground">Backups na Nuvem</p>
              <button
                onClick={() => fetchCloudBackups()}
                disabled={loadingCloud}
                className="text-[10px] text-primary hover:underline"
              >
                {loadingCloud ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>

            {loadingCloud ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : cloudBackups.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="font-body text-[10px] text-muted-foreground">Nenhum backup na nuvem ainda.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {cloudBackups.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-mono text-xs text-foreground">{b.name}</p>
                      <p className="font-body text-[10px] text-muted-foreground">
                        {new Date(b.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLoadCloud(b)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <CloudDownload className="w-3.5 h-3.5" />
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
    </div>
  );
};

export default BackupPage;
