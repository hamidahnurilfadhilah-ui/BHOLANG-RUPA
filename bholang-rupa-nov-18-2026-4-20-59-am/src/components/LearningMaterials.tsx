import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  PlayCircle,
  ExternalLink,
  Maximize2,
  Minimize2,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import type { ExternalResourceView } from '../types';
import { playClickSound } from '../utils/sound';

interface LearningMaterialsProps {
  onOpenExternal: (resource: ExternalResourceView) => void;
}

interface SlideItem {
  id: number;
  category: 'Pengantar' | 'Unsur Seni Rupa' | 'Prinsip Seni Rupa';
  title: string;
  subtitle: string;
  keyPoints: string[];
  visualType: 'intro' | 'titik-garis' | 'bidang-bentuk' | 'warna' | 'tekstur-value' | 'kesatuan-keseimbangan' | 'irama-penekanan' | 'proporsi-harmoni';
}

const SLIDES: SlideItem[] = [
  {
    id: 1,
    category: 'Pengantar',
    title: 'Unsur-Unsur & Prinsip Seni Rupa Kelas X SMK',
    subtitle: 'Fondasi Bahasa Visual dalam Karya Rupa dan Desain Komunikasi Visual',
    keyPoints: [
      'Unsur Seni Rupa adalah elemen fisik penyusun karya: Titik, Garis, Bidang, Bentuk, Ruang, Warna, Tekstur, dan Gelap Terang.',
      'Prinsip Seni Rupa adalah kaidah pengorganisasian unsur: Kesatuan, Keseimbangan, Irama, Penekanan, Proporsi, Keselarasan, dan Kontras.',
      'Penguasaan keduanya membantu siswa merancang komposisi estetis, komunikatif, dan bernilai jual industri kreatif.',
    ],
    visualType: 'intro',
  },
  {
    id: 2,
    category: 'Unsur Seni Rupa',
    title: '01. Titik & Garis (Point & Line)',
    subtitle: 'Elemen paling dasar yang membentuk arah, gerakan, dan karakter ekspresi',
    keyPoints: [
      'Titik adalah pangkal wujud rupa; pengulangan titik rapat membangun teknik pointilisme.',
      'Garis lurus memberi kesan kokoh dan formal; garis lengkung berkesan luwes dan organik.',
      'Garis zig-zag mengekspresikan ketegangan dan energi dinamis; garis putus-putus mengarah pada gerak ritmis.',
    ],
    visualType: 'titik-garis',
  },
  {
    id: 3,
    category: 'Unsur Seni Rupa',
    title: '02. Bidang, Bentuk & Ruang (Shape, Form & Space)',
    subtitle: 'Perbedaan permukaan dua dimensi dan volume tiga dimensi',
    keyPoints: [
      'Bidang (Shape): Area pipih 2D (panjang & lebar) berwujud geometris (persegi, lingkaran) atau organis.',
      'Bentuk (Form): Wujud 3D yang memiliki isi/volume (kubus, bola, silinder, atau bentuk figuratif).',
      'Ruang Positif ditempati objek utama, sementara Ruang Negatif adalah area kosong yang menjaga kelegaan komposisi.',
    ],
    visualType: 'bidang-bentuk',
  },
  {
    id: 4,
    category: 'Unsur Seni Rupa',
    title: '03. Warna (Color Theory)',
    subtitle: 'Klasifikasi pigmen Primer, Sekunder, Tersier serta psikologi warna',
    keyPoints: [
      'Warna Primer (RYB): Merah, Kuning, Biru — tidak dapat dibentuk dari campuran warna lain.',
      'Warna Sekunder: Oranye (Merah+Kuning), Hijau (Kuning+Biru), Ungu (Merah+Biru).',
      'Skema Harmoni: Analogus (berdekatan) memberi rasa tenang; Komplementer (berseberangan) menciptakan kontras kuat.',
    ],
    visualType: 'warna',
  },
  {
    id: 5,
    category: 'Unsur Seni Rupa',
    title: '04. Tekstur & Gelap Terang (Texture & Value)',
    subtitle: 'Kualitas raba permukaan dan ilusi pencahayaan untuk volume',
    keyPoints: [
      'Tekstur Nyata: Nilai raba dan penglihatan sama (misal kanvas tebal, kolase pasir, pahatan kayu).',
      'Tekstur Semu: Terlihat kasar secara visual melalui arsir atau sapuan kuas, tetapi halus bila diraba.',
      'Gelap Terang (Value): Gradasi highlight, midtone, core shadow, dan cast shadow memberi kesan kedalaman 3D.',
    ],
    visualType: 'tekstur-value',
  },
  {
    id: 6,
    category: 'Prinsip Seni Rupa',
    title: '05. Kesatuan (Unity) & Keseimbangan (Balance)',
    subtitle: 'Mengikat seluruh elemen agar utuh dan stabil secara visual',
    keyPoints: [
      'Kesatuan: Keterpaduan bentuk, warna, dan gaya agar karya tidak tampak terpecah.',
      'Keseimbangan Simetris: Bobot dan bentuk kiri-kanan identik, berkesan formal dan megah.',
      'Keseimbangan Asimetris & Radial: Mengimbangi elemen berbeda lewat bobot warna/ukuran atau memancar dari pusat.',
    ],
    visualType: 'kesatuan-keseimbangan',
  },
  {
    id: 7,
    category: 'Prinsip Seni Rupa',
    title: '06. Irama (Rhythm) & Penekanan (Emphasis)',
    subtitle: 'Mengarahkan alur pandangan mata menuju pusat perhatian karya',
    keyPoints: [
      'Irama Repetitif & Progresif: Pengulangan teratur atau perubahan ukuran/warna bertahap memandu alur pandang.',
      'Penekanan (Focal Point): Bagian paling menonjol melalui kontras warna, skala dominan, atau isolasi ruang.',
      'Tanpa focal point, mata audiens kebingungan menentukan pesan utama karya.',
    ],
    visualType: 'irama-penekanan',
  },
  {
    id: 8,
    category: 'Prinsip Seni Rupa',
    title: '07. Proporsi, Keselarasan (Harmony) & Kontras',
    subtitle: 'Menjaga kewajaran perbandingan sekaligus menghidupkan daya tarik',
    keyPoints: [
      'Proporsi: Perbandingan ukuran ideal antarbagian objek (misal anatomi tubuh atau tata letak poster).',
      'Keselarasan (Harmony): Kedekatan karakter antarunsur sehingga nyaman dipandang.',
      'Kontras: Pertentangan terukur (besar-kecil, gelap-terang, panas-dingin) agar karya hidup dan tidak monoton.',
    ],
    visualType: 'proporsi-harmoni',
  },
];

const EBOOK_URL =
  'https://repositori.kemendikdasmen.go.id/19389/1/Kelas%20X_Seni%20Budaya%28Seni%20Rupa%29_KD%203.1.pdf';

const VIDEOS = [
  {
    id: '0zu9Sh3eZ0I',
    title: 'Video 1: Mengenal Unsur-Unsur Seni Rupa Kelas X',
    url: 'https://youtu.be/0zu9Sh3eZ0I',
    duration: 'Materi Unsur Rupa',
    description: 'Penjelasan visual mengenai titik, garis, bidang, bentuk, ruang, warna, tekstur, dan gelap terang.',
  },
  {
    id: 'g15tFYyiSlc',
    title: 'Video 2: Penerapan Prinsip-Prinsip Desain & Komposisi',
    url: 'https://youtu.be/g15tFYyiSlc',
    duration: 'Materi Prinsip Rupa',
    description: 'Studi kasus penyusunan kesatuan, keseimbangan, irama, penekanan, proporsi, dan kontras dalam karya.',
  },
];

export const LearningMaterials: React.FC<LearningMaterialsProps> = ({ onOpenExternal }) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recentExternalTitle, setRecentExternalTitle] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const currentSlide = SLIDES[slideIndex];

  const renderSlideVisual = (type: SlideItem['visualType']) => {
    switch (type) {
      case 'intro':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            <circle cx="95" cy="110" r="52" fill="#D97706" fillOpacity="0.85" />
            <rect x="140" y="55" width="96" height="96" rx="8" fill="#0F766E" fillOpacity="0.85" />
            <polygon points="270,50 325,158 215,158" fill="#C2410C" fillOpacity="0.85" />
            <path d="M35 182 Q 180 140 325 182" stroke="#18181B" strokeWidth="3" fill="none" className="dark:stroke-zinc-200" />
          </svg>
        );
      case 'titik-garis':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            {Array.from({ length: 14 }).map((_, i) => (
              <circle key={i} cx={30 + i * 22} cy={42} r={2 + (i % 4)} fill="#C2410C" />
            ))}
            <line x1="30" y1="82" x2="330" y2="82" stroke="#0F766E" strokeWidth="4" />
            <path d="M30 124 Q 105 90, 180 124 T 330 124" stroke="#D97706" strokeWidth="4" fill="none" />
            <polyline points="30,175 65,150 100,185 135,150 170,185 205,150 240,185 275,150 310,185" stroke="#18181B" strokeWidth="3" fill="none" className="dark:stroke-zinc-200" />
          </svg>
        );
      case 'bidang-bentuk':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            <rect x="35" y="55" width="90" height="90" fill="#0F766E" />
            <text x="80" y="170" textAnchor="middle" fontSize="12" fill="currentColor" className="text-zinc-600 dark:text-zinc-300">Bidang 2D</text>
            <polygon points="210,70 270,45 315,70 255,95" fill="#F59E0B" />
            <polygon points="210,70 255,95 255,155 210,130" fill="#D97706" />
            <polygon points="255,95 315,70 315,130 255,155" fill="#92400E" />
            <text x="262" y="178" textAnchor="middle" fontSize="12" fill="currentColor" className="text-zinc-600 dark:text-zinc-300">Bentuk 3D (Volume)</text>
          </svg>
        );
      case 'warna':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            <circle cx="145" cy="95" r="46" fill="#EF4444" fillOpacity="0.8" />
            <circle cx="215" cy="95" r="46" fill="#EAB308" fillOpacity="0.8" />
            <circle cx="180" cy="145" r="46" fill="#2563EB" fillOpacity="0.8" />
            <text x="180" y="206" textAnchor="middle" fontSize="11" fill="currentColor" className="text-zinc-600 dark:text-zinc-300">Primer RYB &amp; Percampuran Sekunder</text>
          </svg>
        );
      case 'tekstur-value':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <defs>
              <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="45%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#27272A" />
              </radialGradient>
            </defs>
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            <ellipse cx="120" cy="172" rx="58" ry="12" fill="#18181B" fillOpacity="0.2" />
            <circle cx="115" cy="105" r="58" fill="url(#sphereGrad)" />
            <rect x="215" y="45" width="108" height="120" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400" />
            {Array.from({ length: 8 }).map((_, i) => (
              <line key={i} x1={222} y1={56 + i * 14} x2={315} y2={70 + i * 12} stroke="#C2410C" strokeWidth="2" />
            ))}
          </svg>
        );
      case 'kesatuan-keseimbangan':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            <line x1="180" y1="24" x2="180" y2="196" stroke="#A1A1AA" strokeDasharray="5 4" strokeWidth="1.5" />
            <rect x="48" y="65" width="90" height="90" rx="12" fill="#0F766E" />
            <circle cx="242" cy="88" r="24" fill="#D97706" />
            <circle cx="288" cy="132" r="30" fill="#C2410C" />
            <circle cx="232" cy="142" r="14" fill="#0F766E" />
          </svg>
        );
      case 'irama-penekanan':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect
                key={i}
                x={32 + i * 50}
                y={150 - i * 14}
                width={32}
                height={32 + i * 14}
                rx="6"
                fill={i === 4 ? '#DC2626' : '#71717A'}
                fillOpacity={i === 4 ? 1 : 0.45}
              />
            ))}
          </svg>
        );
      case 'proporsi-harmoni':
        return (
          <svg viewBox="0 0 360 220" className="w-full h-full">
            <rect width="360" height="220" rx="12" fill="currentColor" className="text-zinc-100 dark:text-zinc-800/70" />
            <rect x="42" y="38" width="170" height="144" rx="8" fill="none" stroke="#D97706" strokeWidth="2.5" />
            <line x1="147" y1="38" x2="147" y2="182" stroke="#D97706" strokeWidth="1.5" />
            <line x1="147" y1="120" x2="212" y2="120" stroke="#D97706" strokeWidth="1.5" />
            <rect x="236" y="46" width="84" height="36" rx="6" fill="#0F766E" />
            <rect x="236" y="92" width="84" height="36" rx="6" fill="#14B8A6" />
            <rect x="236" y="138" width="84" height="36" rx="6" fill="#5EEAD4" />
          </svg>
        );
    }
  };

  const openExternalAndTrack = (res: ExternalResourceView) => {
    playClickSound();
    setRecentExternalTitle(res.title);
    onOpenExternal(res);
  };

  return (
    <section className="space-y-8">
      {/* Return banner after opening external link */}
      {recentExternalTitle && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
          <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
            Anda baru saja mengakses sumber eksternal: <strong>{recentExternalTitle}</strong>
          </p>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setRecentExternalTitle(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali Fokus ke Materi</span>
          </button>
        </div>
      )}

      {/* 1. Interactive Slide Presentation */}
      <div
        className={`${
          isFullscreen
            ? 'fixed inset-0 z-40 p-4 sm:p-8 bg-[#FAFAF8] dark:bg-[#111214] overflow-y-auto'
            : 'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5 sm:p-7'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Slide Presentasi Materi · {currentSlide.category}
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {currentSlide.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400 tabular-nums px-2">
              Slide {slideIndex + 1} / {SLIDES.length}
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsFullscreen((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}</span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 min-h-[220px]">
            {renderSlideVisual(currentSlide.visualType)}
          </div>

          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {currentSlide.subtitle}
              </p>
              <ul className="mt-4 space-y-3">
                {currentSlide.keyPoints.map((pt, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed"
                  >
                    <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1 shrink-0">
                      0{i + 1}.
                    </span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setSlideIndex(idx);
                    }}
                    className={`w-7 h-7 rounded-md font-mono text-xs font-semibold transition-colors cursor-pointer ${
                      idx === slideIndex
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={slideIndex === 0}
                  onClick={() => {
                    playClickSound();
                    setSlideIndex((i) => Math.max(0, i - 1));
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>
                <button
                  type="button"
                  disabled={slideIndex === SLIDES.length - 1}
                  onClick={() => {
                    playClickSound();
                    setSlideIndex((i) => Math.min(SLIDES.length - 1, i + 1));
                  }}
                  className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-40 hover:opacity-90 cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. E-Book & Video Pembelajaran */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* E-Book Card */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-teal-700 dark:text-teal-400">
              <BookOpen className="w-4 h-4" />
              <span>E-Book Resmi Repositori Kemendikdasmen</span>
            </div>
            <h3 className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Modul Kelas X: Seni Budaya (Seni Rupa) KD 3.1
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Buku digital pegangan siswa yang membahas konsep dasar unsur seni rupa, prinsip tata letak, bahan, dan teknik berkarya dua dimensi.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() =>
                openExternalAndTrack({
                  title: 'E-Book Seni Budaya (Seni Rupa) Kelas X KD 3.1',
                  subtitle: 'Repositori Kemendikdasmen · PDF',
                  url: EBOOK_URL,
                  embedType: 'iframe',
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Buka E-Book di Sini</span>
            </button>
            <a
              href={EBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                playClickSound();
                setRecentExternalTitle('E-Book Seni Budaya (Seni Rupa) Kelas X KD 3.1');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span>Buka PDF Tab Baru</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Video Pembelajaran Cards */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Video Pembelajaran Terintegrasi
              </p>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                Simak Penjelasan Unsur &amp; Prinsip Seni Rupa
              </h3>
            </div>
            {activeVideoId && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveVideoId(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Tutup Pemutar</span>
              </button>
            )}
          </div>

          {activeVideoId ? (
            <div className="mt-4 space-y-3">
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0`}
                  title="Video Pembelajaran BHOLANG RUPA"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setActiveVideoId(null);
                  }}
                  className="inline-flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali ke Daftar Video</span>
                </button>
                <a
                  href={`https://youtu.be/${activeVideoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    playClickSound();
                    setRecentExternalTitle('Video Pembelajaran YouTube');
                  }}
                  className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 hover:underline"
                >
                  <span>Tonton di YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {VIDEOS.map((vid) => (
                <div
                  key={vid.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col justify-between bg-zinc-50/70 dark:bg-zinc-900/40"
                >
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{vid.duration}</p>
                    <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                      {vid.title}
                    </h4>
                    <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {vid.description}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setActiveVideoId(vid.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Putar Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        openExternalAndTrack({
                          title: vid.title,
                          subtitle: 'Video Pembelajaran YouTube',
                          url: vid.url,
                          embedType: 'youtube',
                          youtubeId: vid.id,
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <span>Mode Fokus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
