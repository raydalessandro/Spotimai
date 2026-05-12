import type { ReactNode } from 'react';

export function NavItem({ icon, label, active, onClick, small }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 ${small ? 'px-3 py-1.5 text-xs' : 'px-3 py-2 text-sm'} rounded-md transition w-full text-left ${active ? 'bg-zinc-800/80 text-zinc-100' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50'}`}>
      {icon}<span>{label}</span>
    </button>
  );
}

export function BottomNavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 py-3 transition ${active ? 'text-zinc-100' : 'text-zinc-500'}`}>
      {icon}<span className="text-[10px] font-mono uppercase tracking-wider">{label}</span>
    </button>
  );
}
