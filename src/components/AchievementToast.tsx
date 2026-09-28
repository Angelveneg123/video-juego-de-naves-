import React from 'react';
import { ACHIEVEMENTS } from '../game/progression';
import { Trophy } from 'lucide-react';

interface AchievementToastProps {
  achievementId: string | null;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievementId }) => {
  if (!achievementId) return null;
  const ach = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!ach) return null;

  return (
    <div className="fixed top-6 right-6 z-50 flex items-center gap-3 p-3.5 rounded-xl bg-slate-900/95 border border-amber-500/60 shadow-2xl shadow-amber-500/20 backdrop-blur-md animate-bounce">
      <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shrink-0">
        {ach.icon}
      </div>
      <div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">
          <Trophy className="w-3.5 h-3.5" /> ¡Logro Desbloqueado!
        </div>
        <h4 className="font-display font-bold text-sm text-slate-100">{ach.title}</h4>
        <p className="text-[11px] font-mono text-slate-300">{ach.description}</p>
      </div>
    </div>
  );
};
