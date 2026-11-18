import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Palette, BookOpen, Award } from 'lucide-react';
import { playClickSound, playSuccessSound } from '../utils/sound';

interface WelcomeModalProps {
  open: boolean;
  onEnter: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ open, onEnter }) => {
  const handleEnter = () => {
    playSuccessSound();
    onEnter();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/75 backdrop-blur-md p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-heading"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8] dark:bg-[#17191C] shadow-2xl grid grid-cols-1 md:grid-cols-12"
          >
            <div className="md:col-span-5 relative min-h-[220px] md:min-h-[420px] bg-zinc-900 overflow-hidden">
              <img
                src="/src/assets/images/hero_atelier_rupa_1794949804649.jpg"
                alt="Studio Seni Rupa BHOLANG RUPA"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
                <p className="text-xs font-medium text-amber-300 tracking-wide">
                  Seni Budaya · Kelas X SMK
                </p>
                <p className="mt-1 text-sm text-zinc-200 leading-relaxed">
                  Unsur-Unsur &amp; Prinsip Seni Rupa Berbasis Eksplorasi Digital
                </p>
              </div>
            </div>

            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Studio Pembelajaran Interaktif · Kurikulum Merdeka
                </p>
                <h1
                  id="welcome-heading"
                  className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight"
                >
                  SELAMAT DATANG DI BHOLANG RUPA
                </h1>
                <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Ruang belajar terpadu untuk memahami unsur titik, garis, bidang, bentuk, warna, tekstur, serta prinsip komposisi melalui laboratorium kanvas digital, galeri apresiasi, diskusi kelas, dan evaluasi terintegrasi.
                </p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-5">
                  <div className="flex items-start gap-2.5">
                    <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Materi &amp; E-Book</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Slide, PDF &amp; Video</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Lab Seni Digital</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Spektrum &amp; Multi-Layer</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Evaluasi &amp; Drive</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Kuis, PDF &amp; Sheets</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Klik tombol masuk untuk mengaktifkan audio studio
                </span>
                <button
                  type="button"
                  onClick={handleEnter}
                  onMouseDown={() => playClickSound()}
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white font-semibold text-sm shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  <span>Masuk ke Studio Belajar</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
