import React from 'react';
import { Info } from 'lucide-react';

interface DemoNoticeBannerProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const DemoNoticeBanner: React.FC<DemoNoticeBannerProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-violet-500/25 bg-[#11162B] px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <Info className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium text-slate-100">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="self-start sm:self-center px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-500/40 bg-violet-600/15 text-violet-200 hover:bg-violet-600/25 transition-colors whitespace-nowrap shrink-0"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
