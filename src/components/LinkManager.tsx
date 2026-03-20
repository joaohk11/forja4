import { useState } from 'react';
import { useApp } from '@/lib/context';
import { LocalAccessLink } from '@/lib/types';
import {
  Link2, X, Copy, Check, Trash2, UserCog, ClipboardList,
  ChevronDown, ChevronUp, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ROLE_LABELS: Record<LocalAccessLink['role'], string> = {
  tecnico: 'Técnico',
  auxiliar: 'Auxiliar',
};

const TIPO_LABELS: Record<LocalAccessLink['tipo'], string> = {
  team: 'Time',
  athlete: 'Atleta',
};

interface Props {
  teamId: string;
}

export function LinkManager({ teamId }: Props) {
  const { data, addAccessLink, revokeAccessLink } = useApp();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const team = data.teams.find(t => t.id === teamId);
  const teamLinks = (data.accessLinks || []).filter(
    l => l.tipo === 'team' && l.referenceId === teamId
  );

  const buildUrl = (token: string) =>
    `${window.location.origin}/app?token=${token}`;

  const copyToClipboard = async (token: string) => {
    const url = buildUrl(token);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(token);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleGenerate = (role: LocalAccessLink['role']) => {
    const label = role === 'tecnico'
      ? `Técnico — ${team?.name}`
      : `Auxiliar — ${team?.name}`;
    const link = addAccessLink('team', teamId, role, label);
    copyToClipboard(link.token);
    toast.success(`Link de ${ROLE_LABELS[role]} gerado e copiado!`);
  };

  const handleRevoke = (token: string) => {
    revokeAccessLink(token);
    toast.success('Link revogado.');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
        title="Gerenciar links de acesso"
        data-testid="button-link-manager"
      >
        <Link2 className="w-3 h-3" strokeWidth={1.5} />
        Links
        {teamLinks.length > 0 && (
          <span className="ml-0.5 text-primary font-bold">{teamLinks.length}</span>
        )}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 card-surface neon-border rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-mono text-xs font-medium text-foreground">Links de Acesso</p>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>

          {/* Generate buttons */}
          <div className="px-4 py-3 space-y-2 border-b border-border">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
              Gerar novo link
            </p>
            <button
              onClick={() => handleGenerate('auxiliar')}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/15 transition-colors text-left"
              data-testid="button-generate-auxiliar"
            >
              <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="font-mono text-xs text-primary">Auxiliar Técnico</p>
                <p className="font-mono text-[9px] text-muted-foreground">Ver treinos, atletas e IA</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" strokeWidth={2} />
            </button>

            <button
              onClick={() => handleGenerate('tecnico')}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors text-left"
              data-testid="button-generate-tecnico"
            >
              <UserCog className="w-4 h-4 text-foreground flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <p className="font-mono text-xs text-foreground">Técnico</p>
                <p className="font-mono text-[9px] text-muted-foreground">Acesso completo ao app</p>
              </div>
              <Plus className="w-3.5 h-3.5 text-muted-foreground ml-auto flex-shrink-0" strokeWidth={2} />
            </button>
          </div>

          {/* Existing links */}
          {teamLinks.length > 0 && (
            <div className="px-4 py-3 max-h-56 overflow-y-auto">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
                Links ativos ({teamLinks.length})
              </p>
              <div className="space-y-2">
                {teamLinks.map(link => (
                  <div
                    key={link.token}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/40"
                    data-testid={`link-item-${link.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                          link.role === 'tecnico'
                            ? 'bg-foreground/10 text-foreground'
                            : 'bg-primary/15 text-primary'
                        }`}>
                          {ROLE_LABELS[link.role]}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground">
                          {TIPO_LABELS[link.tipo]}
                        </span>
                      </div>
                      <p className="font-mono text-[9px] text-muted-foreground truncate">
                        {format(new Date(link.createdAt), 'dd/MM/yy HH:mm')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => copyToClipboard(link.token)}
                        className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-primary"
                        title="Copiar link"
                        data-testid={`button-copy-${link.id}`}
                      >
                        {copied === link.token
                          ? <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={2} />
                          : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                        }
                      </button>
                      <button
                        onClick={() => handleRevoke(link.token)}
                        className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                        title="Revogar link"
                        data-testid={`button-revoke-${link.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teamLinks.length === 0 && (
            <div className="px-4 py-4 text-center">
              <p className="font-mono text-[10px] text-muted-foreground">Nenhum link ativo para este time</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
