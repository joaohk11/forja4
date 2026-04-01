import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/lib/context';
import { Download, Upload, Cloud, CloudOff, Trash2, RotateCcw, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseConfigured } from '@/lib/supabaseClient';
import { saveBackup, getBackups, restoreBackup, deleteBackup, type CloudBackup } from '@/lib/backupService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BackupPage = () => {
  const { exportData, importData } = useApp();

  // ── Cloud state ────────────────────────────────────────────────
  const [cloudBackups, setCloudBackups]   = useState<CloudBackup[]>([]);
  const [loadingList, setLoadingList]     = useState(false);
  const [savingCloud, setSavingCloud]     = useState(false);
  const [restoringId, setRestoringId]     = useState<string | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Local backup handlers (unchanged) ─────────────────────────
  const handleExport = () => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `forja-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado com sucesso');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const success = importData(ev.target?.result as string);
      toast[success ? 'success' : 'error'](
        success ? 'Backup importado com sucesso' : 'Arquivo de backup inválido'
      );
    };
    reader.readAsText(file);
  };

  // ── Cloud handlers ─────────────────────────────────────────────
  const fetchCloudBackups = useCallback(async () => {
    if (!supabaseConfigured) return;
    setLoadingList(true);
    try {
      const list = await getBackups();
      setCloudBackups(list);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar backups da nuvem');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchCloudBackups();
  }, [fetchCloudBackups]);

  const handleSaveCloud = async () => {
    setSavingCloud(true);
    try {
      await saveBackup(JSON.parse(exportData()));
      toast.success('Backup salvo na nuvem');
      fetchCloudBackups();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar backup na nuvem');
    } finally {
      setSavingCloud(false);
    }
  };

  const handleRestoreCloud = async (id: string) => {
    setRestoringId(id);
    try {
      const restored = await restoreBackup(id);
      const success  = importData(JSON.stringify(restored));
      toast[success ? 'success' : 'error'](
        success ? 'Backup restaurado com sucesso' : 'Falha ao restaurar backup'
      );
    } catch (err) {
      console.error(err);
      toast.error('Erro ao restaurar backup da nuvem');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteCloud = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteBackup(id);
      setCloudBackups(prev => prev.filter(b => b.id !== id));
      toast.success('Backup excluído');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir backup');
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  return (
    <div className="px-4 py-6 pb-10">
      <h2 className="font-mono text-sm font-medium mb-6">Backup</h2>

      <div className="space-y-4">
        {/* ── Export local ──────────────────────────────────── */}
        <button
          onClick={handleExport}
          className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left hover:neon-glow transition-all"
        >
          <Download className="w-6 h-6 text-primary flex-shrink-0" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Exportar Backup</p>
            <p className="font-body text-[10px] text-muted-foreground">Salvar dados em arquivo JSON</p>
          </div>
        </button>

        {/* ── Import local ──────────────────────────────────── */}
        <label className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left cursor-pointer hover:neon-glow transition-all block">
          <Upload className="w-6 h-6 text-primary flex-shrink-0" strokeWidth={1.5} />
          <div>
            <p className="font-mono text-sm text-foreground">Importar Backup</p>
            <p className="font-body text-[10px] text-muted-foreground">Restaurar dados de arquivo JSON</p>
          </div>
          <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>

        {/* ── Cloud section ─────────────────────────────────── */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {supabaseConfigured
                ? <Cloud className="w-4 h-4 text-primary" strokeWidth={1.5} />
                : <CloudOff className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              }
              <h3 className="font-mono text-xs text-foreground uppercase tracking-widest">
                Backup na Nuvem
              </h3>
            </div>
            {supabaseConfigured && (
              <button
                onClick={fetchCloudBackups}
                disabled={loadingList}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {!supabaseConfigured ? (
            <div className="card-surface rounded-lg p-4 flex items-start gap-3 border border-muted-foreground/20">
              <CloudOff className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="font-mono text-xs text-foreground mb-1">Supabase não configurado</p>
                <p className="font-body text-[10px] text-muted-foreground">
                  Configure SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Save to cloud */}
              <button
                onClick={handleSaveCloud}
                disabled={savingCloud}
                className="w-full card-surface neon-border rounded-lg p-4 flex items-center gap-4 text-left hover:neon-glow transition-all disabled:opacity-50"
              >
                {savingCloud
                  ? <Loader2 className="w-6 h-6 text-primary flex-shrink-0 animate-spin" strokeWidth={1.5} />
                  : <Cloud className="w-6 h-6 text-primary flex-shrink-0" strokeWidth={1.5} />
                }
                <div>
                  <p className="font-mono text-sm text-foreground">Salvar Backup na Nuvem</p>
                  <p className="font-body text-[10px] text-muted-foreground">Enviar dados para o Supabase</p>
                </div>
              </button>

              {/* Backup list */}
              {loadingList ? (
                <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  <span className="font-mono text-xs">Carregando backups...</span>
                </div>
              ) : cloudBackups.length === 0 ? (
                <p className="text-center font-mono text-xs text-muted-foreground py-4">
                  Nenhum backup na nuvem ainda
                </p>
              ) : (
                <div className="space-y-2">
                  {cloudBackups.map(backup => (
                    <div
                      key={backup.id}
                      className="card-surface border border-border/40 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-foreground truncate">{backup.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                            {formatDate(backup.Created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Restore */}
                          <button
                            onClick={() => handleRestoreCloud(backup.id)}
                            disabled={restoringId === backup.id}
                            title="Restaurar"
                            className="p-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                          >
                            {restoringId === backup.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                              : <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
                            }
                          </button>

                          {/* Delete */}
                          {confirmDeleteId === backup.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteCloud(backup.id)}
                                disabled={deletingId === backup.id}
                                className="font-mono text-[10px] px-2 py-1 rounded bg-destructive/80 text-destructive-foreground hover:bg-destructive disabled:opacity-40"
                              >
                                {deletingId === backup.id ? '...' : 'Sim'}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="font-mono text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted/20"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(backup.id)}
                              title="Excluir"
                              className="p-1.5 rounded border border-destructive/20 text-destructive/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupPage;
