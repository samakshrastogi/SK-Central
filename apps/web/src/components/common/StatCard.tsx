import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, trend, icon: Icon }: StatCardProps) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="glass rounded-2xl p-5 transition"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <strong className="mt-2 block text-3xl font-bold text-white">{value}</strong>
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-brand-aqua">
          <Icon size={21} aria-hidden="true" />
        </span>
      </div>
      {trend ? <p className="mt-4 text-sm font-medium text-emerald-300">{trend}</p> : null}
    </motion.article>
  );
}
