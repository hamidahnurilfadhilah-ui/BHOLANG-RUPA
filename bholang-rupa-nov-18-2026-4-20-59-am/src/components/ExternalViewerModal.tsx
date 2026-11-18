import React from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { ExternalResourceView } from '../types';
import { playClickSound } from '../utils/sound';

interface ExternalViewerModalProps {
  resource: ExternalResourceView | null;
  onClose: () => void;
}

export const ExternalViewerModal: React.FC<ExternalViewerModalProps> = ({ resource, onClose }) => {
  if (!resource) return null;

  const embedSrc =
    resource.embedType === 'youtube' && resource.youtubeId
      ? `https://www.youtube.com/embed/${resource.youtubeId}?rel=0`
      : resource.url;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FAFAF8] dark:bg-[#111214]"
      role="dialog"
      aria-modal="true"
    >
      {/* Prominent Return Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke BHOLANG RUPA</span>
          </button>
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {resource.title}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {resource.subtitle}
            </p>
          </div>
        </div>

        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => playClickSound()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
        >
          <span>Buka di Tab Baru</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Embedded Viewer */}
      <div className="flex-1 relative bg-zinc-100 dark:bg-zinc-950 p-3 sm:p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-6xl h-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col">
          <iframe
            src={embedSrc}
            title={resource.title}
            className="w-full flex-1 border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Jika konten eksternal membatasi tampilan frame di browser Anda, gunakan tombol &ldquo;Buka di Tab Baru&rdquo; lalu tekan &ldquo;Kembali ke BHOLANG RUPA&rdquo;.
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Selesai &amp; Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
