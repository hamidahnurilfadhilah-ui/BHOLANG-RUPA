import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Compass,
  ExternalLink,
  BookOpen,
  Sliders,
  Palette,
  Layers,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Download,
  UploadCloud,
  Undo2,
  Redo2,
  Eraser,
  Paintbrush,
  Sparkles,
  Droplets,
  Shapes,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { ExternalResourceView, User } from '../types';
import { playClickSound, playSuccessSound } from '../utils/sound';
import {
  getGoogleAccessToken,
  TARGET_DRIVE_FOLDER_ID,
  uploadBlobToDrive,
} from '../services/googleWorkspace';

interface ArtLabSectionProps {
  user: User | null;
  token: string | null;
  onRequireAuth: () => void;
  onOpenExternal: (res: ExternalResourceView) => void;
  onArtworkPublished: () => void;
}

const ARTVENTURE_URL =
  'https://murid.kemendikdasmen.go.id/sumber-belajar/materi/Gim%20Edukasi/artventure-unsur-rupa-prinsip-desain-4c880e67-04d4-4b25-933f-07056949c099';

const PRIMARY_COLORS = [
  { name: 'Merah Primer', hex: '#E11D48' },
  { name: 'Kuning Primer', hex: '#FACC15' },
  { name: 'Biru Primer', hex: '#2563EB' },
];

const SECONDARY_COLORS = [
  { name: 'Oranye Sekunder', hex: '#F97316' },
  { name: 'Hijau Sekunder', hex: '#16A34A' },
  { name: 'Ungu Sekunder', hex: '#7C3AED' },
];

const NEUTRAL_SWATCHES = ['#18181B', '#52525B', '#A1A1AA', '#FFFFFF', '#78350F', '#0F766E'];

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

// Subtractive pigment-like mixing (converts RGB to CMY-weighted blend for realistic paint behavior)
function mixPigmentColors(hex1: string, hex2: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const t = ratio / 100;

  // Convert to subtractive absorbance space
  const c1 = 1 - r1 / 255;
  const m1 = 1 - g1 / 255;
  const y1 = 1 - b1 / 255;

  const c2 = 1 - r2 / 255;
  const m2 = 1 - g2 / 255;
  const y2 = 1 - b2 / 255;

  // Geometric/linear hybrid blend so Yellow + Blue yields rich Green instead of muddy grey
  const c = c1 * (1 - t) + c2 * t;
  const m = m1 * (1 - t) + m2 * t;
  const y = y1 * (1 - t) + y2 * t;

  // Subtle brightness preservation for vivid secondary mixes
  const r = (1 - c) * 255;
  const g = (1 - m) * 255;
  const b = (1 - y) * 255;
  return rgbToHex(r, g, b);
}

function mixRgbColors(hex1: string, hex2: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const t = ratio / 100;
  return rgbToHex(r1 * (1 - t) + r2 * t, g1 * (1 - t) + g2 * t, b1 * (1 - t) + b2 * t);
}

function describeColorTemp(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  if (Math.abs(r - g) < 18 && Math.abs(g - b) < 18) return 'Netral / Akromatik';
  if (r >= b && r + g * 0.4 > b * 1.4) return 'Suhu Hangat (Warm)';
  return 'Suhu Sejuk (Cool)';
}

type BrushMode = 'normal' | 'stipple' | 'blending' | 'shape' | 'eraser';
type ShapeKind = 'circle' | 'square' | 'triangle' | 'star';

interface CanvasLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

const CANVAS_W = 860;
const CANVAS_H = 520;

export const ArtLabSection: React.FC<ArtLabSectionProps> = ({
  user,
  token,
  onRequireAuth,
  onOpenExternal,
  onArtworkPublished,
}) => {
  // Interactive Demo State
  const [demoTab, setDemoTab] = useState<'composition' | 'value-line'>('composition');
  const [balanceMode, setBalanceMode] = useState<'simetris' | 'asimetris' | 'radial'>('asimetris');
  const [rhythmCount, setRhythmCount] = useState(5);
  const [emphasisScale, setEmphasisScale] = useState(1.3);
  const [lightAngle, setLightAngle] = useState(40);
  const [lineWave, setLineWave] = useState(32);

  // Student Guide Toggle
  const [showGuide, setShowGuide] = useState(true);

  // Color Spectrum Mixer State
  const [colorA, setColorA] = useState('#E11D48');
  const [colorB, setColorB] = useState('#FACC15');
  const [activeSlot, setActiveSlot] = useState<'A' | 'B'>('A');
  const [mixRatio, setMixRatio] = useState(50);
  const [mixMode, setMixMode] = useState<'pigment' | 'rgb'>('pigment');

  const mixedHex =
    mixMode === 'pigment'
      ? mixPigmentColors(colorA, colorB, mixRatio)
      : mixRgbColors(colorA, colorB, mixRatio);

  // Digital Canvas Multi-Layer State
  const [layers, setLayers] = useState<CanvasLayer[]>([
    { id: 'layer-1', name: 'Lapisan Dasar (Sketsa)', visible: true, opacity: 1 },
    { id: 'layer-2', name: 'Lapisan Warna Utama', visible: true, opacity: 1 },
  ]);
  const [activeLayerId, setActiveLayerId] = useState('layer-2');
  const [brushMode, setBrushMode] = useState<BrushMode>('normal');
  const [shapeKind, setShapeKind] = useState<ShapeKind>('circle');
  const [brushColor, setBrushColor] = useState('#C2410C');
  const [brushSize, setBrushSize] = useState(14);
  const [brushOpacity, setBrushOpacity] = useState(0.9);
  const [canvasBg, setCanvasBg] = useState('#FFFFFF');

  const layerCanvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const historyRef = useRef<Array<{ layerId: string; imageData: ImageData }>>([]);
  const redoRef = useRef<Array<{ layerId: string; imageData: ImageData }>>([]);

  // Publish from Canvas State
  const [publishTitle, setPublishTitle] = useState('');
  const [publishCategory, setPublishCategory] = useState('Eksplorasi Unsur & Prinsip');
  const [publishDesc, setPublishDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  const pushHistorySnapshot = useCallback((layerId: string) => {
    const canvas = layerCanvasRefs.current[layerId];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
    historyRef.current = [...historyRef.current.slice(-19), { layerId, imageData: snapshot }];
    redoRef.current = [];
  }, []);

  const handleUndo = () => {
    playClickSound();
    const last = historyRef.current.pop();
    if (!last) return;
    const canvas = layerCanvasRefs.current[last.layerId];
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    redoRef.current.push({
      layerId: last.layerId,
      imageData: ctx.getImageData(0, 0, CANVAS_W, CANVAS_H),
    });
    ctx.putImageData(last.imageData, 0, 0);
  };

  const handleRedo = () => {
    playClickSound();
    const next = redoRef.current.pop();
    if (!next) return;
    const canvas = layerCanvasRefs.current[next.layerId];
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    historyRef.current.push({
      layerId: next.layerId,
      imageData: ctx.getImageData(0, 0, CANVAS_W, CANVAS_H),
    });
    ctx.putImageData(next.imageData, 0, 0);
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const drawShapeAt = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, kind: ShapeKind) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = brushOpacity;
    const r = size;
    ctx.beginPath();
    if (kind === 'circle') {
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'square') {
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    } else if (kind === 'triangle') {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'star') {
      const spikes = 5;
      const outer = r * 1.15;
      const inner = r * 0.48;
      let rot = (Math.PI / 2) * 3;
      const step = Math.PI / spikes;
      ctx.moveTo(x, y - outer);
      for (let i = 0; i < spikes; i++) {
        ctx.lineTo(x + Math.cos(rot) * outer, y + Math.sin(rot) * outer);
        rot += step;
        ctx.lineTo(x + Math.cos(rot) * inner, y + Math.sin(rot) * inner);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  };

  const drawBrushSegment = (from: { x: number; y: number }, to: { x: number; y: number }, isStart: boolean) => {
    const activeLayer = layers.find((l) => l.id === activeLayerId);
    if (!activeLayer || !activeLayer.visible) return;
    const canvas = layerCanvasRefs.current[activeLayerId];
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.save();

    if (brushMode === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize * 1.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (brushMode === 'normal') {
      ctx.globalAlpha = brushOpacity;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else if (brushMode === 'stipple') {
      // Pointillism / Kuas Bintik
      ctx.fillStyle = brushColor;
      ctx.globalAlpha = brushOpacity;
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(1, Math.ceil(dist / 5));
      for (let s = 0; s < steps; s++) {
        const px = from.x + ((to.x - from.x) * s) / steps;
        const py = from.y + ((to.y - from.y) * s) / steps;
        const dotCount = Math.max(5, Math.round(brushSize * 0.7));
        for (let i = 0; i < dotCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * brushSize * 1.1;
          const dotR = Math.max(1, Math.random() * (brushSize * 0.18));
          ctx.beginPath();
          ctx.arc(px + Math.cos(angle) * radius, py + Math.sin(angle) * radius, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (brushMode === 'blending') {
      // Soft watercolor / airbrush blending gradient
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const steps = Math.max(1, Math.ceil(dist / Math.max(2, brushSize * 0.25)));
      const [r, g, b] = hexToRgb(brushColor);
      const softRadius = brushSize * 1.4;
      for (let s = 0; s <= steps; s++) {
        const px = from.x + ((to.x - from.x) * s) / steps;
        const py = from.y + ((to.y - from.y) * s) / steps;
        const grad = ctx.createRadialGradient(px, py, 0, px, py, softRadius);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${brushOpacity * 0.26})`);
        grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, ${brushOpacity * 0.1})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, softRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (brushMode === 'shape') {
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      if (isStart || dist >= brushSize * 1.5) {
        drawShapeAt(ctx, to.x, to.y, brushSize, brushColor, shapeKind);
        lastPointRef.current = to;
        ctx.restore();
        return;
      }
      ctx.restore();
      return;
    }

    ctx.restore();
    lastPointRef.current = to;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pushHistorySnapshot(activeLayerId);
    const pt = getCanvasPoint(e);
    isDrawingRef.current = true;
    lastPointRef.current = pt;
    drawBrushSegment(pt, pt, true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const pt = getCanvasPoint(e);
    drawBrushSegment(lastPointRef.current, pt, false);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const addLayer = () => {
    playClickSound();
    if (layers.length >= 6) return;
    const newId = `layer-${Date.now()}`;
    setLayers((prev) => [
      ...prev,
      { id: newId, name: `Layer ${prev.length + 1}`, visible: true, opacity: 1 },
    ]);
    setActiveLayerId(newId);
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    playClickSound();
    const target = index + direction;
    if (target < 0 || target >= layers.length) return;
    setLayers((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const deleteLayer = (id: string) => {
    playClickSound();
    if (layers.length <= 1) return;
    setLayers((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (activeLayerId === id && next.length > 0) {
        setActiveLayerId(next[next.length - 1].id);
      }
      return next;
    });
  };

  const clearActiveLayer = () => {
    playClickSound();
    pushHistorySnapshot(activeLayerId);
    const canvas = layerCanvasRefs.current[activeLayerId];
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  };

  const mergeAllLayersToDataUrl = (): string => {
    const out = document.createElement('canvas');
    out.width = CANVAS_W;
    out.height = CANVAS_H;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = canvasBg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    layers.forEach((layer) => {
      if (!layer.visible) return;
      const src = layerCanvasRefs.current[layer.id];
      if (!src) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(src, 0, 0);
      ctx.restore();
    });
    return out.toDataURL('image/png');
  };

  const handleDownloadPng = () => {
    playSuccessSound();
    const dataUrl = mergeAllLayersToDataUrl();
    const link = document.createElement('a');
    link.download = `${(publishTitle || 'karya_bholang_rupa').toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handlePublishToGalleryAndDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    if (!publishTitle.trim()) {
      setPublishStatus('Harap isi judul karya terlebih dahulu.');
      return;
    }

    setPublishing(true);
    setPublishStatus('Menggabungkan layer dan menyimpan karya...');
    try {
      const dataUrl = mergeAllLayersToDataUrl();
      const uploadRes = await fetch('/api/upload-canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataUrl, title: publishTitle }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Gagal menyimpan gambar');

      let driveFileId = '';
      let driveWebLink = '';
      const googleToken = getGoogleAccessToken();
      if (googleToken) {
        setPublishStatus('Mengunggah otomatis ke folder Google Drive...');
        const resBlob = await (await fetch(dataUrl)).blob();
        const fileName = `${user.kelas}_${user.name}_${publishTitle.trim()}.png`.replace(/\s+/g, '_');
        const driveFile = await uploadBlobToDrive(googleToken, {
          blob: resBlob,
          fileName,
          mimeType: 'image/png',
          categoryFolder: '01_Karya_Siswa',
          rootFolderId: TARGET_DRIVE_FOLDER_ID,
        });
        driveFileId = driveFile.id;
        driveWebLink = driveFile.webViewLink || '';
      }

      const artRes = await fetch('/api/artworks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: publishTitle.trim(),
          description:
            publishDesc.trim() || 'Karya dibuat di Laboratorium Seni Digital BHOLANG RUPA.',
          category: publishCategory,
          image_url: uploadData.url,
          drive_file_id: driveFileId,
          drive_web_link: driveWebLink,
        }),
      });
      if (!artRes.ok) throw new Error('Gagal menerbitkan ke Galeri');

      playSuccessSound();
      setPublishStatus(
        driveFileId
          ? 'Karya berhasil diterbitkan ke Galeri Kelas dan tersimpan otomatis di Google Drive!'
          : 'Karya berhasil diterbitkan ke Galeri Kelas! (Hubungkan akun Google jika ingin arsip otomatis ke Drive).'
      );
      setPublishTitle('');
      setPublishDesc('');
      onArtworkPublished();
    } catch (err) {
      setPublishStatus(err instanceof Error ? err.message : 'Gagal mengirim karya.');
    } finally {
      setPublishing(false);
    }
  };

  // Pick color into Spectrum slot
  const pickIntoSlot = (hex: string) => {
    playClickSound();
    if (activeSlot === 'A') setColorA(hex);
    else setColorB(hex);
  };

  // Ensure initial starter guide stroke on Layer 1 once
  useEffect(() => {
    const c = layerCanvasRefs.current['layer-1'];
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    if (c.dataset.initialized === 'true') return;
    c.dataset.initialized = 'true';
    ctx.save();
    ctx.strokeStyle = 'rgba(161, 161, 170, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(36, 36, CANVAS_W - 72, CANVAS_H - 72);
    ctx.beginPath();
    ctx.moveTo(CANVAS_W / 2, 36);
    ctx.lineTo(CANVAS_W / 2, CANVAS_H - 36);
    ctx.moveTo(36, CANVAS_H / 2);
    ctx.lineTo(CANVAS_W - 36, CANVAS_H / 2);
    ctx.stroke();
    ctx.restore();
  }, []);

  return (
    <section className="space-y-8">
      {/* 1. Mari Berpetualang Banner */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <Compass className="w-4 h-4" />
            <span>Gim Edukasi Resmi Kemendikdasmen</span>
          </div>
          <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Mari Berpetualang: Artventure Unsur Rupa &amp; Prinsip Desain
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            Uji kepekaan visual melalui petualangan interaktif interdisiplin di portal Sumber Belajar Kemendikdasmen. Setelah selesai bermain, gunakan tombol kembali untuk melanjutkan praktik di Laboratorium Seni.
          </p>
        </div>
        <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenExternal({
                title: 'Mari Berpetualang — Artventure Unsur Rupa & Prinsip Desain',
                subtitle: 'Gim Edukasi Kemendikdasmen',
                url: ARTVENTURE_URL,
                embedType: 'iframe',
              });
            }}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold cursor-pointer"
          >
            <Compass className="w-4 h-4" />
            <span>Mari Berpetualang</span>
          </button>
          <a
            href={ARTVENTURE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playClickSound()}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span>Tab Baru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2. Demo Interaktif Guru & Siswa */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              Simulasi &amp; Demo Kelas (Guru &amp; Siswa)
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              Demo Interaktif Unsur &amp; Prinsip Komposisi
            </h3>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDemoTab('composition');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                demoTab === 'composition'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Keseimbangan &amp; Irama
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDemoTab('value-line');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                demoTab === 'value-line'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Garis &amp; Gelap Terang
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-4 h-[260px] flex items-center justify-center">
            {demoTab === 'composition' ? (
              <svg viewBox="0 0 440 220" className="w-full h-full">
                <line x1="220" y1="15" x2="220" y2="205" stroke="#A1A1AA" strokeDasharray="4 4" strokeWidth="1" />
                {balanceMode === 'simetris' && (
                  <>
                    <rect x="65" y="65" width="70" height="90" rx="8" fill="#0F766E" />
                    <rect x="305" y="65" width="70" height="90" rx="8" fill="#0F766E" />
                    <circle cx="220" cy="110" r={26 * emphasisScale} fill="#C2410C" />
                  </>
                )}
                {balanceMode === 'asimetris' && (
                  <>
                    <rect x="55" y="55" width="110" height="110" rx="12" fill="#0F766E" fillOpacity="0.88" />
                    {Array.from({ length: rhythmCount }).map((_, idx) => (
                      <circle
                        key={idx}
                        cx={245 + idx * 28}
                        cy={75 + (idx % 2) * 55}
                        r={10 + idx * 1.5}
                        fill="#D97706"
                        fillOpacity={0.75}
                      />
                    ))}
                    <circle cx="290" cy="110" r={24 * emphasisScale} fill="#DC2626" />
                  </>
                )}
                {balanceMode === 'radial' && (
                  <>
                    {Array.from({ length: rhythmCount + 3 }).map((_, idx) => {
                      const angle = (idx / (rhythmCount + 3)) * Math.PI * 2;
                      const px = 220 + Math.cos(angle) * 68;
                      const py = 110 + Math.sin(angle) * 68;
                      return <circle key={idx} cx={px} cy={py} r="14" fill="#0F766E" fillOpacity="0.85" />;
                    })}
                    <circle cx="220" cy="110" r={24 * emphasisScale} fill="#D97706" />
                  </>
                )}
              </svg>
            ) : (
              <svg viewBox="0 0 440 220" className="w-full h-full">
                <defs>
                  <radialGradient
                    id="demoSphere"
                    cx={`${50 - Math.cos((lightAngle * Math.PI) / 180) * 28}%`}
                    cy={`${50 - Math.sin((lightAngle * Math.PI) / 180) * 28}%`}
                    r="65%"
                  >
                    <stop offset="0%" stopColor="#FEF3C7" />
                    <stop offset="45%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#18181B" />
                  </radialGradient>
                </defs>
                <ellipse
                  cx={145 + Math.cos((lightAngle * Math.PI) / 180) * 24}
                  cy="178"
                  rx="56"
                  ry="12"
                  fill="#000"
                  fillOpacity="0.2"
                />
                <circle cx="145" cy="112" r="56" fill="url(#demoSphere)" />
                <path
                  d={`M 240 60 Q 290 ${60 - lineWave}, 330 60 T 410 60`}
                  stroke="#0F766E"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  d={`M 240 110 Q 290 ${110 + lineWave}, 330 110 T 410 110`}
                  stroke="#C2410C"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  d={`M 240 160 Q 290 ${160 - lineWave}, 330 160 T 410 160`}
                  stroke="currentColor"
                  className="text-zinc-700 dark:text-zinc-300"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            {demoTab === 'composition' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Pola Keseimbangan Komposisi
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['simetris', 'asimetris', 'radial'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          playClickSound();
                          setBalanceMode(m);
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold capitalize border cursor-pointer ${
                          balanceMode === m
                            ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Irama Pengulangan Elemen</span>
                    <span className="font-mono tabular-nums">{rhythmCount} unit</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    value={rhythmCount}
                    onChange={(e) => setRhythmCount(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Skala Penekanan (Focal Point)</span>
                    <span className="font-mono tabular-nums">{emphasisScale.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.8}
                    step={0.1}
                    value={emphasisScale}
                    onChange={(e) => setEmphasisScale(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Sudut Datang Cahaya (Gelap Terang)</span>
                    <span className="font-mono tabular-nums">{lightAngle}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={lightAngle}
                    onChange={(e) => setLightAngle(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    <span>Amplitudo Kelengkungan Garis</span>
                    <span className="font-mono tabular-nums">{lineWave} px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={55}
                    value={lineWave}
                    onChange={(e) => setLineWave(Number(e.target.value))}
                    className="w-full accent-amber-600"
                  />
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Geser arah cahaya untuk mengamati perpindahan sisi terang (highlight) dan bayangan jatuh (cast shadow) yang membangun volume 3D.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Panduan Tata Cara Penggunaan Khusus Siswa */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Panduan Tata Cara Penggunaan Laboratorium Seni (Khusus Siswa)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ikuti 5 langkah terstruktur berikut sebelum dan saat berkarya di kanvas digital
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setShowGuide((v) => !v);
            }}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {showGuide ? 'Sembunyikan Panduan' : 'Tampilkan Panduan'}
          </button>
        </div>

        {showGuide && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              {
                step: '01',
                title: 'Racik Warna di Spektrum',
                desc: 'Pilih Warna Primer atau Sekunder pada Slot A dan Slot B, lalu geser rasio untuk menemukan warna campuran terbaik.',
              },
              {
                step: '02',
                title: 'Atur Sistem Layer',
                desc: 'Gunakan Layer Dasar untuk garis sketsa dan buat Layer baru untuk pewarnaan agar gambar mudah diedit tanpa merusak sketsa.',
              },
              {
                step: '03',
                title: 'Pilih 4 Karakter Kuas',
                desc: 'Coba Kuas Biasa untuk garis tegas, Kuas Bintik (pointilisme), Kuas Blending (gradasi halus), dan Kuas Shape (geometris).',
              },
              {
                step: '04',
                title: 'Sempurnakan Komposisi',
                desc: 'Terapkan prinsip keseimbangan, irama, dan penekanan. Manfaatkan tombol Undo/Redo serta pengaturan opacity layer.',
              },
              {
                step: '05',
                title: 'Unduh & Kirim ke Galeri',
                desc: 'Unduh karya sebagai PNG atau kirim langsung ke Galeri Kelas dan folder Google Drive untuk dinilai dan diapresiasi guru.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3.5"
              >
                <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  Langkah {item.step}
                </span>
                <h4 className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Spektrum Warna Interaktif & Pencampur 2 Warna */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Laboratorium Teori Warna
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              Spektrum Warna Interaktif &amp; Pencampur Dua Warna
            </h3>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMixMode('pigment');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                mixMode === 'pigment'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Pigmen Cat (RYB)
            </button>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMixMode('rgb');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                mixMode === 'rgb'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Cahaya Digital (RGB)
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary, Secondary, and Spectrum Picker */}
          <div className="lg:col-span-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Target Pengisian Slot:
              </span>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveSlot('A');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  activeSlot === 'A'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Warna 1 ({colorA})
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActiveSlot('B');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                  activeSlot === 'B'
                    ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                    : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Warna 2 ({colorB})
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Pemilihan Warna Primer
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {PRIMARY_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => pickIntoSlot(c.hex)}
                    className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-left cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Pemilihan Warna Sekunder
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {SECONDARY_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => pickIntoSlot(c.hex)}
                    className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-left cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                      {c.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Spektrum Warna Bebas (Hue &amp; Kecerahan)
              </p>
              <div className="grid grid-cols-12 gap-1.5">
                {[
                  '#DC2626', '#EA580C', '#D97706', '#EAB308', '#65A30D', '#16A34A',
                  '#0D9488', '#0284C7', '#2563EB', '#4F46E5', '#7C3AED', '#DB2777',
                  '#FCA5A5', '#FDBA74', '#FDE047', '#BEF264', '#86EFAC', '#5EEAD4',
                  '#7DD3FC', '#93C5FD', '#C4B5FD', '#F9A8D4', '#FFFFFF', '#18181B',
                ].map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => pickIntoSlot(hex)}
                    title={hex}
                    aria-label={`Pilih warna ${hex}`}
                    className="h-7 rounded-md border border-zinc-300 dark:border-zinc-700 hover:scale-105 transition-transform cursor-pointer"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Custom Warna 1:</span>
                  <input
                    type="color"
                    value={colorA}
                    onChange={(e) => setColorA(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <span>Custom Warna 2:</span>
                  <input
                    type="color"
                    value={colorB}
                    onChange={(e) => setColorB(e.target.value.toUpperCase())}
                    className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Mixer Output */}
          <div className="lg:col-span-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3 items-center">
              <div className="text-center">
                <div
                  className="h-16 rounded-xl border border-black/10 shadow-inner"
                  style={{ backgroundColor: colorA }}
                />
                <p className="mt-1.5 font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {colorA}
                </p>
                <p className="text-[11px] text-zinc-500">Warna 1</p>
              </div>

              <div className="text-center">
                <div
                  className="h-20 rounded-xl border-2 border-zinc-900/20 dark:border-white/20 shadow-md"
                  style={{ backgroundColor: mixedHex }}
                />
                <p className="mt-1.5 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                  {mixedHex}
                </p>
                <p className="text-[11px] text-zinc-500">Hasil Campuran</p>
              </div>

              <div className="text-center">
                <div
                  className="h-16 rounded-xl border border-black/10 shadow-inner"
                  style={{ backgroundColor: colorB }}
                />
                <p className="mt-1.5 font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {colorB}
                </p>
                <p className="text-[11px] text-zinc-500">Warna 2</p>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                <span>Rasio Campuran (Warna 1 : Warna 2)</span>
                <span className="font-mono tabular-nums">
                  {100 - mixRatio}% : {mixRatio}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={mixRatio}
                onChange={(e) => setMixRatio(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="text-xs text-zinc-600 dark:text-zinc-300">
                <p>
                  RGB:{' '}
                  <span className="font-mono">
                    {hexToRgb(mixedHex).join(', ')}
                  </span>
                </p>
                <p>{describeColorTemp(mixedHex)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playSuccessSound();
                  setBrushColor(mixedHex);
                  if (brushMode === 'eraser') setBrushMode('normal');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                <Palette className="w-4 h-4" />
                <span>Pakai Warna Ini di Kanvas</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Kanvas Digital Multi-Layer Lengkap */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400">
              Studio Menggambar Digital Multi-Layer
            </p>
            <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              Kanvas Digital BHOLANG RUPA
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleRedo}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
              <span>Redo</span>
            </button>
            <button
              type="button"
              onClick={clearActiveLayer}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bersihkan Layer</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh PNG</span>
            </button>
          </div>
        </div>

        {/* Workspace Grid: Left Tools | Center Canvas | Right Layers */}
        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Brush & Color Toolbar */}
          <div className="xl:col-span-3 space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4">
            <div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                Jenis Kuas &amp; Alat
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'normal', label: 'Kuas Biasa', icon: Paintbrush },
                  { id: 'stipple', label: 'Kuas Bintik', icon: Sparkles },
                  { id: 'blending', label: 'Kuas Blending', icon: Droplets },
                  { id: 'shape', label: 'Kuas Shape', icon: Shapes },
                  { id: 'eraser', label: 'Penghapus', icon: Eraser },
                ].map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setBrushMode(tool.id as BrushMode);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                        brushMode === tool.id
                          ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {brushMode === 'shape' && (
              <div>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Pilih Bentuk Kuas Shape
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {([
                    { id: 'circle', label: 'Bulat' },
                    { id: 'square', label: 'Kotak' },
                    { id: 'triangle', label: 'Segitiga' },
                    { id: 'star', label: 'Bintang' },
                  ] as const).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setShapeKind(s.id);
                      }}
                      className={`py-1.5 px-1 rounded-md text-[11px] font-semibold border cursor-pointer ${
                        shapeKind === s.id
                          ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300'
                          : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                <span>Ukuran Kuas</span>
                <span className="font-mono tabular-nums">{brushSize} px</span>
              </div>
              <input
                type="range"
                min={2}
                max={64}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                <span>Opasitas Kuas</span>
                <span className="font-mono tabular-nums">{Math.round(brushOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={Math.round(brushOpacity * 100)}
                onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
                className="w-full accent-amber-600"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Warna Menggambar
                </span>
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value.toUpperCase())}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  aria-label="Pilih warna kuas"
                />
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  ...PRIMARY_COLORS.map((c) => c.hex),
                  ...SECONDARY_COLORS.map((c) => c.hex),
                  ...NEUTRAL_SWATCHES,
                  mixedHex,
                ].map((hex, i) => (
                  <button
                    key={`${hex}-${i}`}
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setBrushColor(hex);
                      if (brushMode === 'eraser') setBrushMode('normal');
                    }}
                    className={`h-7 rounded-md border cursor-pointer ${
                      brushColor.toUpperCase() === hex.toUpperCase()
                        ? 'ring-2 ring-amber-600 border-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <span>Warna Kertas Latar</span>
                <input
                  type="color"
                  value={canvasBg}
                  onChange={(e) => setCanvasBg(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
              </label>
            </div>
          </div>

          {/* Interactive Multi-Layer Canvas Stage */}
          <div className="xl:col-span-6">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ backgroundColor: canvasBg }}
              className="relative w-full aspect-[860/520] rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-inner overflow-hidden touch-none cursor-crosshair select-none"
            >
              {layers.map((layer, index) => (
                <canvas
                  key={layer.id}
                  ref={(el) => {
                    layerCanvasRefs.current[layer.id] = el;
                  }}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  style={{
                    zIndex: index + 1,
                    opacity: layer.visible ? layer.opacity : 0,
                  }}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-2">
              <span>
                Layer aktif: <strong>{layers.find((l) => l.id === activeLayerId)?.name}</strong> · Alat:{' '}
                <strong className="capitalize">{brushMode}</strong>
              </span>
              <span className="font-mono">860 × 520 px</span>
            </p>
          </div>

          {/* Layer Management Panel */}
          <div className="xl:col-span-3 space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Manajemen Layer (Kayer)
                </span>
              </div>
              <button
                type="button"
                disabled={layers.length >= 6}
                onClick={addLayer}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {[...layers].reverse().map((layer, revIdx) => {
                const realIdx = layers.length - 1 - revIdx;
                const isActive = layer.id === activeLayerId;
                return (
                  <div
                    key={layer.id}
                    onClick={() => {
                      playClickSound();
                      setActiveLayerId(layer.id);
                    }}
                    className={`rounded-lg border p-2.5 cursor-pointer transition-colors ${
                      isActive
                        ? 'border-amber-600 bg-amber-50/70 dark:bg-amber-950/30'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {layer.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayer(realIdx, 1);
                          }}
                          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                          title="Naikkan Layer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayer(realIdx, -1);
                          }}
                          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
                          title="Turunkan Layer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playClickSound();
                            setLayers((prev) =>
                              prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))
                            );
                          }}
                          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                          title={layer.visible ? 'Sembunyikan' : 'Tampilkan'}
                        >
                          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        {layers.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLayer(layer.id);
                            }}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 text-red-600"
                            title="Hapus Layer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Sliders className="w-3 h-3 text-zinc-400 shrink-0" />
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={Math.round(layer.opacity * 100)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = Number(e.target.value) / 100;
                          setLayers((prev) =>
                            prev.map((l) => (l.id === layer.id ? { ...l, opacity: val } : l))
                          );
                        }}
                        className="w-full accent-amber-600"
                      />
                      <span className="font-mono text-[10px] text-zinc-500 w-8 text-right tabular-nums">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Publish form directly from canvas */}
            <form
              onSubmit={handlePublishToGalleryAndDrive}
              className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5"
            >
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Kirim Hasil Kanvas ke Galeri &amp; Drive
              </p>
              <input
                type="text"
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                placeholder="Judul karya siswa..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              />
              <select
                value={publishCategory}
                onChange={(e) => setPublishCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              >
                <option value="Eksplorasi Unsur & Prinsip">Eksplorasi Unsur &amp; Prinsip</option>
                <option value="Prinsip Irama & Warna">Prinsip Irama &amp; Warna</option>
                <option value="Unsur Garis & Gelap Terang">Unsur Garis &amp; Gelap Terang</option>
                <option value="Tekstur & Penekanan Radial">Tekstur &amp; Penekanan Radial</option>
              </select>
              <textarea
                rows={2}
                value={publishDesc}
                onChange={(e) => setPublishDesc(e.target.value)}
                placeholder="Penjelasan unsur & prinsip yang dipakai..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                disabled={publishing}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{publishing ? 'Mengirim...' : 'Terbitkan Karya'}</span>
              </button>
              {publishStatus && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                  {publishStatus}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
