// src/pages/BackupPage.tsx
import { useState, useEffect } from 'react';
import { useApp } from '@/lib/context';
import { saveBackup, getBackups, restoreBackup, deleteBackup, CloudBackup } from '@/lib/backupService';
import {
  Download,
  Upload,
  Cloud,
  CloudDownload,
  Loader2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

const BackupPage = () => {
  const { exportData, importData } = useApp();

  const [cloudBackups, setCloudBackups] = useState<CloudBackup[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [savingCloud, setSavingCloud] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchCloudBackups = async () => {
    setLoadingCloud(true);
    try {
      const data = await getBackups();
      setCloudBackups(data);
    } catch (e) {
      console.error('fetchCloudBackups:', e);
      toast.error('Erro ao buscar backups na nuvem');
    } finally {
      setLoadingCloud(false);
    }
  };

  useEffect(() => {
    fetchCloudBackups();
  }, []);

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
    setSavingCloud(true);
    try {
      const data = JSON.parse(exportData());
      await saveBackup(data);
      toast.success('Backup salvo na nuvem');
      fetchCloudBackups();
    } catch (e) {
      console.error('handleSaveCloud:', e);
      toast.error('Erro ao salvar backup: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setSavingCloud(false);
    }
  };

  const handleRestoreCloud = async (backup: CloudBackup) => {
    if (!window.confirm(`Restaurar backup "${backup.name}"? Os dados atuais serão substituídos.`))
      return;
    try {
      const restored = await restoreBackup(backup.id);
      const success = importData(JSON.stringify(restored));
      if (success) toast.success('Backup restaurado com sucesso');
      else toast.error('Erro ao restaurar backup');
    } catch (e) {
      console.error('handleRestoreCloud:', e);
      toast.error('Erro ao restaurar backup: ' + (e instanceof Error ? e.message : ''));
    }
  };

  const handleDeleteCloud = async (backup: CloudBackup) => {
    if (!window.confirm(`Excluir backup "${backup.name}"?`)) return;
    setDeletingId(backup.id);
    try {
      await deleteBackup(backup.id);
      toast.success('Backup excluído');
      setCloudBackups(prev => prev.filter(b => b.id !== backup.id));
    } catch (e) {
      console.error('handleDeleteCloud:', e);
      toast.error('Erro ao excluir backup: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="px-4 py-6 space-y-4">
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
          {savingCloud
            ? <Loader2 className="w-6 h-6 text-primary animate-spin" strokeWidth={1.5} />
            : <Cloud className="w-6 h-6 text-primary" strokeWidth={1.5} />}
          <div>
            <p className="font-mono text-sm text-foreground">Salvar Backup na Nuvem</p>
            <p className="font-body text-[10px] text-muted-foreground">Salvar dados no Supabase</p>
          </div>
        </button>
      </div>

      {/* Lista de backups na nuvem */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs text-primary">Backups na Nuvem</p>
          {loadingCloud && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
        </div>

        {!loadingCloud && cloudBackups.length === 0 && (
          <p className="font-mono text-[11px] text-muted-foreground text-center py-4">
            Nenhum backup encontrado
          </p>
        )}

        {cloudBackups.map(backup => (
          <div
            key={backup.id}
            className="card-surface rounded-lg p-3 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-mono text-xs text-foreground truncate">{backup.name}</p>
              <p className="font-body text-[10px] text-muted-foreground">
                {new Date(backup.Created_at).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleRestoreCloud(backup)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 border border-primary/30 rounded text-[10px] font-mono text-primary hover:bg-primary/20 transition-colors"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                Restaurar
              </button>
              <button
                onClick={() => handleDeleteCloud(backup)}
                disabled={deletingId === backup.id}
                className="flex items-center justify-center w-7 h-7 bg-red-500/10 border border-red-500/30 rounded text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {deletingId === backup.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BackupPage;
