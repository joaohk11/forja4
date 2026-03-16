import { useNavigate } from 'react-router-dom';
import { MacrocycleCard } from '@/components/MacrocycleCard';
import { HexGrid } from '@/components/HexGrid';
import { TeamRadars } from '@/components/TeamRadars';
import { useApp } from '@/lib/context';
import { Bell, Link2 } from 'lucide-react';

const Dashboard = () => {
  const { data, activeTeamId } = useApp();
  const navigate = useNavigate();
  const activeTeam = data.teams.find(t => t.id === activeTeamId);

  const pendingSuggestions = (data.trainingSuggestions || []).filter(
    s => s.status === 'pending' && s.teamId === activeTeamId
  );

  const auxiliaryLink = `${window.location.origin}/auxiliar/${activeTeamId}`;

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] px-4 py-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          {activeTeam?.name || 'Time 1'}
        </p>
        <div className="flex items-center gap-2">
          {/* Auxiliary link button */}
          <button
            onClick={() => {
              navigator.clipboard?.writeText(auxiliaryLink).catch(() => {});
              window.open(auxiliaryLink, '_blank');
            }}
            className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
            title="Acesso do Auxiliar"
          >
            <Link2 className="w-3 h-3" strokeWidth={1.5} />
            Auxiliar
          </button>
          {/* Suggestions notification */}
          {pendingSuggestions.length > 0 && (
            <button
              onClick={() => navigate('/sugestoes')}
              className="flex items-center gap-1 font-mono text-[10px] text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
              {pendingSuggestions.length} sugest{pendingSuggestions.length > 1 ? 'ões' : 'ão'}
            </button>
          )}
        </div>
      </div>

      {/* Pending suggestions banner */}
      {pendingSuggestions.length > 0 && (
        <button
          onClick={() => navigate('/sugestoes')}
          className="w-full mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-yellow-500/15 transition-colors text-left"
        >
          <Bell className="w-4 h-4 text-yellow-400 flex-shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs text-yellow-400 font-medium">
              {pendingSuggestions.length} sugest{pendingSuggestions.length > 1 ? 'ões' : 'ão'} do auxiliar técnico
            </p>
            <p className="font-body text-[10px] text-muted-foreground">Toque para revisar e aprovar</p>
          </div>
          <span className="font-mono text-[10px] text-yellow-400">Ver →</span>
        </button>
      )}

      <MacrocycleCard />
      <div className="flex-1 flex items-center justify-center">
        <HexGrid />
      </div>
      {/* Team Radars */}
      <div className="mt-4">
        <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-3">Radar do Time</h3>
        <TeamRadars teamId={activeTeamId} size={150} />
      </div>
    </div>
  );
};

export default Dashboard;
