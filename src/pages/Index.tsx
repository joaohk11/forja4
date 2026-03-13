import { MacrocycleCard } from '@/components/MacrocycleCard';
import { HexGrid } from '@/components/HexGrid';
import { TeamRadars } from '@/components/TeamRadars';
import { useApp } from '@/lib/context';

const Dashboard = () => {
  const { data, activeTeamId } = useApp();
  const activeTeam = data.teams.find(t => t.id === activeTeamId);

  return (
    <div className="flex flex-col min-h-[calc(100vh-52px)] px-4 py-6">
      <div className="mb-2">
        <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          {activeTeam?.name || 'Time 1'}
        </p>
      </div>
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
