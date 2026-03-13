import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Calendar, BarChart3, Users, History, Download, ClipboardCheck, Brain } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/lib/context';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Calendar, label: 'Calendário', path: '/calendario' },
  { icon: BarChart3, label: 'Periodização', path: '/periodizacao' },
  { icon: Users, label: 'Atletas', path: '/atletas' },
  { icon: ClipboardCheck, label: 'Avaliações', path: '/avaliacoes' },
  { icon: History, label: 'Histórico', path: '/historico' },
  { icon: Brain, label: 'IA do Treinador', path: '/ia-treinador' },
  { icon: Download, label: 'Backup', path: '/backup' },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, activeTeamId, setActiveTeam } = useApp();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <h1 className="font-mono text-lg font-bold neon-text tracking-[0.3em]">FORJA</h1>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Team selector */}
            <div className="p-4 border-b border-sidebar-border">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Time Ativo</p>
              <div className="flex gap-2">
                {data.teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => { setActiveTeam(team.id); navigate(`/time/${team.id}`); onClose(); }}
                    className={`flex-1 font-mono text-xs py-2 px-3 rounded border transition-all ${
                      activeTeamId === team.id
                        ? 'border-primary text-primary neon-border'
                        : 'border-border text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {team.name}
                  </button>
                ))}
              </div>
            </div>

            <nav className="flex-1 p-2">
              {menuItems.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); onClose(); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-body transition-all ${
                      active
                        ? 'text-primary bg-sidebar-accent neon-border'
                        : 'text-sidebar-foreground hover:text-primary hover:bg-sidebar-accent/50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" strokeWidth={1.5} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
              <p className="font-mono text-[10px] text-muted-foreground text-center">FORJA v2.0</p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
