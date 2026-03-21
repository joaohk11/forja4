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

const BackupPage = () => {
  const { exportData, importData } = useApp();

  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);

  // --- Fetch backups from Supabase ---
  const fetchCloudBackups = async () => {
    setLoadingCloud(true);
    try {
      const { data, error } = await supabase
        .from('backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCloudBackups(data || []);
    } catch (e) {
      toast.error('Erro ao buscar backups na nuvem');
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    fetchCloudBackups();
  }, []);

  // --- Export local backup ---
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

  // --- Import local backup ---
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

  // --- Save backup to Supabase ---
  const handleSaveCloud = async () => {
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
    } catch (e) {
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

      const success = importData(data.data);
      if (success) toast.success('Backup restaurado com sucesso');
      else toast.error('Erro ao restaurar backup');
    } catch (e) {
      toast.error('Erro ao restaurar backup');
    }
  };

  return (
    <div className="px-4 py-6">
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
              Salvar dados no Supabase
            </p>
          </div>
        </button>

        {/* Cloud Backups List */}
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
    </div>
  );
};

export default BackupPage;
