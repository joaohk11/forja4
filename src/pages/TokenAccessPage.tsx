import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/lib/context';
import { accessService } from '@/services/accessService';
import { LocalAccessLink } from '@/lib/types';
import { ShieldOff, Loader2, Lock } from 'lucide-react';

const TokenAccessPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, setActiveTeam } = useApp();

  const [status, setStatus] = useState<'resolving' | 'invalid' | 'redirecting'>('resolving');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      setErrorMsg('Nenhum token fornecido na URL.');
      setStatus('invalid');
      return;
    }

    const resolve = async () => {
      // 1. Check localStorage-based access links first (works without Supabase)
      let link: LocalAccessLink | null = (data.accessLinks || []).find(l => l.token === token) ?? null;

      // 2. Fall back to Supabase if configured and not found locally
      if (!link) {
        const remote = await accessService.validateToken(token);
        if (remote) {
          link = {
            id: remote.id,
            token: remote.token,
            tipo: remote.tipo as LocalAccessLink['tipo'],
            referenceId: remote.reference_id,
            role: remote.role as LocalAccessLink['role'],
            createdAt: remote.created_at || new Date().toISOString(),
          };
        }
      }

      if (!link) {
        setErrorMsg('Link de acesso inválido ou expirado.');
        setStatus('invalid');
        return;
      }

      setStatus('redirecting');

      if (link.tipo === 'team') {
        const team = data.teams.find(t => t.id === link!.referenceId);
        if (!team) {
          setErrorMsg('Time não encontrado. O link pode ter sido gerado em outro dispositivo.');
          setStatus('invalid');
          return;
        }

        if (link.role === 'tecnico') {
          // Full coach access: set the active team and go to dashboard
          setActiveTeam(link.referenceId);
          navigate('/', { replace: true });
        } else {
          // Auxiliary access: redirect to the existing auxiliary page
          navigate(`/auxiliar/${link.referenceId}`, { replace: true });
        }

      } else if (link.tipo === 'athlete') {
        const athlete = data.athletes.find(a => a.id === link!.referenceId);
        if (!athlete) {
          setErrorMsg('Atleta não encontrado. O link pode ter sido gerado em outro dispositivo.');
          setStatus('invalid');
          return;
        }
        // For athlete tipo, redirect to auxiliary scoped to that athlete's team
        // with athlete pre-selected (via state)
        navigate(`/auxiliar/${athlete.teamId}`, {
          replace: true,
          state: { focusAthleteId: link.referenceId },
        });
      } else {
        setErrorMsg('Tipo de acesso desconhecido.');
        setStatus('invalid');
      }
    };

    resolve();
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'resolving' || status === 'redirecting') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h1 className="font-mono text-xl font-bold neon-text mb-1">FORJA</h1>
          <p className="font-mono text-xs text-muted-foreground">Validando acesso...</p>
        </div>
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
      <div className="w-16 h-16 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
        <ShieldOff className="w-8 h-8 text-red-400" strokeWidth={1.5} />
      </div>
      <div className="text-center max-w-sm">
        <h1 className="font-mono text-xl font-bold text-foreground mb-2">Acesso Negado</h1>
        <p className="font-body text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
      </div>
      <button
        onClick={() => navigate('/', { replace: true })}
        className="font-mono text-xs text-primary hover:underline mt-2"
      >
        Voltar ao início
      </button>
    </div>
  );
};

export default TokenAccessPage;
