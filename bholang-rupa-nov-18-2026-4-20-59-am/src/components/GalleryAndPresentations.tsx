import React, { useState } from 'react';
import {
  Heart,
  Pin,
  MessageCircle,
  Upload,
  Award,
  Download,
  ExternalLink,
  FileText,
  Eye,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import type { Artwork, Presentation, User } from '../types';
import { playClickSound, playSuccessSound } from '../utils/sound';
import {
  getGoogleAccessToken,
  TARGET_DRIVE_FOLDER_ID,
  uploadBlobToDrive,
} from '../services/googleWorkspace';

interface GalleryAndPresentationsProps {
  user: User | null;
  token: string | null;
  artworks: Artwork[];
  presentations: Presentation[];
  onRequireAuth: () => void;
  onRefresh: () => void;
}

const APPRECIATION_BADGES = [
  'Komposisi Seimbang',
  'Kontras Warna Kuat',
  'Eksplorasi Tekstur',
  'Ide Orisinal',
];

export const GalleryAndPresentations: React.FC<GalleryAndPresentationsProps> = ({
  user,
  token,
  artworks,
  presentations,
  onRequireAuth,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'gallery' | 'presentations'>('gallery');
  const [filterMode, setFilterMode] = useState<'all' | 'pinned'>('all');

  // Artwork Upload State
  const [showArtUpload, setShowArtUpload] = useState(false);
  const [artTitle, setArtTitle] = useState('');
  const [artCategory, setArtCategory] = useState('Eksplorasi Unsur & Prinsip');
  const [artDesc, setArtDesc] = useState('');
  const [artFile, setArtFile] = useState<File | null>(null);
  const [artUploading, setArtUploading] = useState(false);
  const [artMessage, setArtMessage] = useState('');

  // Comment input map
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // Presentation Upload & Preview State
  const [showPresUpload, setShowPresUpload] = useState(false);
  const [presTitle, setPresTitle] = useState('');
  const [presTopic, setPresTopic] = useState('Unsur & Prinsip Seni Rupa');
  const [presDesc, setPresDesc] = useState('');
  const [presFile, setPresFile] = useState<File | null>(null);
  const [presUploading, setPresUploading] = useState(false);
  const [presMessage, setPresMessage] = useState('');
  const [previewPres, setPreviewPres] = useState<Presentation | null>(null);

  const visibleArtworks =
    filterMode === 'pinned' ? artworks.filter((a) => a.is_pinned) : artworks;

  const handleUploadArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    if (!artTitle.trim() || !artFile) {
      setArtMessage('Judul karya dan berkas gambar wajib diisi.');
      return;
    }

    setArtUploading(true);
    setArtMessage('Mengunggah karya ke server...');
    try {
      const formData = new FormData();
      formData.append('file', artFile);
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || 'Gagal mengunggah gambar');

      let driveFileId = '';
      let driveWebLink = '';
      const googleToken = getGoogleAccessToken();
      if (googleToken) {
        setArtMessage('Menyimpan otomatis ke Google Drive...');
        const ext = artFile.name.split('.').pop() || 'png';
        const safeName = `${user.kelas}_${user.name}_${artTitle.trim()}.${ext}`.replace(/\s+/g, '_');
        const driveFile = await uploadBlobToDrive(googleToken, {
          blob: artFile,
          fileName: safeName,
          mimeType: artFile.type || 'image/png',
          categoryFolder: '01_Karya_Siswa',
          rootFolderId: TARGET_DRIVE_FOLDER_ID,
        });
        driveFileId = driveFile.id;
        driveWebLink = driveFile.webViewLink || '';
      }

      const createRes = await fetch('/api/artworks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: artTitle.trim(),
          description: artDesc.trim() || 'Karya siswa kelas X SMK.',
          category: artCategory,
          image_url: upData.url,
          drive_file_id: driveFileId,
          drive_web_link: driveWebLink,
        }),
      });
      if (!createRes.ok) throw new Error('Gagal menyimpan data karya.');

      playSuccessSound();
      setArtTitle('');
      setArtDesc('');
      setArtFile(null);
      setShowArtUpload(false);
      setArtMessage('');
      onRefresh();
    } catch (err) {
      setArtMessage(err instanceof Error ? err.message : 'Gagal mengunggah karya.');
    } finally {
      setArtUploading(false);
    }
  };

  const handleToggleLike = async (artworkId: number) => {
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    await fetch(`/api/artworks/${artworkId}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const handleAppreciate = async (artworkId: number, badge: string) => {
    playSuccessSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    await fetch(`/api/artworks/${artworkId}/appreciate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ badge }),
    });
  };

  const handlePinToggle = async (artworkId: number) => {
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    await fetch(`/api/artworks/${artworkId}/pin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const handleAddComment = async (e: React.FormEvent, artworkId: number) => {
    e.preventDefault();
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    const text = (commentInputs[artworkId] || '').trim();
    if (!text) return;
    await fetch(`/api/artworks/${artworkId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: text }),
    });
    setCommentInputs((prev) => ({ ...prev, [artworkId]: '' }));
  };

  const handleUploadPresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    if (!presTitle.trim() || !presFile) {
      setPresMessage('Judul dan berkas presentasi wajib dipilih.');
      return;
    }

    setPresUploading(true);
    setPresMessage('Mengunggah presentasi...');
    try {
      const fd = new FormData();
      fd.append('file', presFile);
      const upRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || 'Gagal mengunggah berkas');

      let driveFileId = '';
      let driveWebLink = '';
      const googleToken = getGoogleAccessToken();
      if (googleToken) {
        setPresMessage('Menyimpan presentasi otomatis ke Google Drive...');
        const ext = presFile.name.split('.').pop() || 'pdf';
        const safeName = `${user.kelas}_${user.name}_${presTitle.trim()}.${ext}`.replace(/\s+/g, '_');
        const driveFile = await uploadBlobToDrive(googleToken, {
          blob: presFile,
          fileName: safeName,
          mimeType: presFile.type || 'application/octet-stream',
          categoryFolder: '02_Presentasi_Siswa',
          rootFolderId: TARGET_DRIVE_FOLDER_ID,
        });
        driveFileId = driveFile.id;
        driveWebLink = driveFile.webViewLink || '';
      }

      const saveRes = await fetch('/api/presentations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: presTitle.trim(),
          topic: presTopic,
          description: presDesc.trim(),
          file_url: upData.url,
          file_name: presFile.name,
          file_type: presFile.type || 'application/octet-stream',
          file_size: presFile.size,
          drive_file_id: driveFileId,
          drive_web_link: driveWebLink,
        }),
      });
      if (!saveRes.ok) throw new Error('Gagal menyimpan presentasi.');

      playSuccessSound();
      setPresTitle('');
      setPresDesc('');
      setPresFile(null);
      setShowPresUpload(false);
      setPresMessage('');
      onRefresh();
    } catch (err) {
      setPresMessage(err instanceof Error ? err.message : 'Gagal mengunggah presentasi.');
    } finally {
      setPresUploading(false);
    }
  };

  return (
    <section className="space-y-6">
      {/* Sub-navigation between Galeri Kelas and Presentasi Siswa */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveSubTab('gallery');
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeSubTab === 'gallery'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Galeri Kelas &amp; Apresiasi ({artworks.length})
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setActiveSubTab('presentations');
            }}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              activeSubTab === 'presentations'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Presentasi Siswa ({presentations.length})
          </button>
        </div>

        {activeSubTab === 'gallery' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setFilterMode('all');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Semua Karya
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setFilterMode('pinned');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  filterMode === 'pinned'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Disematkan Guru
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                if (!user) return onRequireAuth();
                setShowArtUpload((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Karya</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              playClickSound();
              if (!user) return onRequireAuth();
              setShowPresUpload((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Presentasi</span>
          </button>
        )}
      </div>

      {/* ==================== GALERI KELAS ==================== */}
      {activeSubTab === 'gallery' && (
        <div className="space-y-6">
          {showArtUpload && (
            <form
              onSubmit={handleUploadArtwork}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Unggah Karya Seni Rupa ke Galeri &amp; Google Drive
                </h3>
                <button
                  type="button"
                  onClick={() => setShowArtUpload(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={artTitle}
                  onChange={(e) => setArtTitle(e.target.value)}
                  placeholder="Judul karya..."
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                />
                <select
                  value={artCategory}
                  onChange={(e) => setArtCategory(e.target.value)}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                >
                  <option value="Eksplorasi Unsur & Prinsip">Eksplorasi Unsur &amp; Prinsip</option>
                  <option value="Prinsip Irama & Warna">Prinsip Irama &amp; Warna</option>
                  <option value="Unsur Garis & Gelap Terang">Unsur Garis &amp; Gelap Terang</option>
                  <option value="Tekstur & Penekanan Radial">Tekstur &amp; Penekanan Radial</option>
                </select>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setArtFile(e.target.files?.[0] || null)}
                  className="text-xs text-zinc-600 dark:text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:font-semibold"
                />
              </div>
              <textarea
                rows={2}
                value={artDesc}
                onChange={(e) => setArtDesc(e.target.value)}
                placeholder="Ceritakan unsur seni rupa dan prinsip desain yang Anda terapkan..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
              {artMessage && (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{artMessage}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={artUploading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {artUploading ? 'Mengunggah...' : 'Simpan & Publikasikan Karya'}
                </button>
              </div>
            </form>
          )}

          {visibleArtworks.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-10 text-center text-sm text-zinc-500">
              Belum ada karya pada kategori ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {visibleArtworks.map((art) => (
                <article
                  key={art.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Artwork Image */}
                    <div className="relative aspect-[4/3] bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                      <img
                        src={art.image_url}
                        alt={art.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 -z-10 flex flex-col items-center justify-center text-zinc-400">
                        <ImageIcon className="w-8 h-8" />
                        <span className="text-xs mt-1">{art.title}</span>
                      </div>
                      {art.is_pinned && (
                        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-600 text-white text-[11px] font-semibold shadow-sm">
                          <Pin className="w-3 h-3" />
                          <span>Karya Pilihan Guru</span>
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{art.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{art.author_kelas}</span>
                      </div>
                      <h3 className="mt-1.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {art.title}
                      </h3>
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-0.5">
                        Karya oleh {art.author_name}
                      </p>
                      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {art.description}
                      </p>

                      {/* Appreciation Tags (unboxed inline text list) */}
                      {art.appreciations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-teal-700 dark:text-teal-400">
                          <span className="font-semibold">Apresiasi: </span>
                          {Array.from(new Set(art.appreciations.map((ap) => ap.badge))).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Actions & Real-Time Comments */}
                  <div className="px-5 pb-5 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleLike(art.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                            art.liked_by_me
                              ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                              : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${art.liked_by_me ? 'fill-current' : ''}`} />
                          <span className="font-mono tabular-nums">{art.likes_count}</span>
                        </button>

                        <select
                          aria-label="Beri Apresiasi"
                          defaultValue=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            handleAppreciate(art.id, e.target.value);
                            e.target.value = '';
                          }}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer"
                        >
                          <option value="" disabled>
                            + Apresiasi
                          </option>
                          {APPRECIATION_BADGES.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {user?.role === 'guru' && (
                          <button
                            type="button"
                            onClick={() => handlePinToggle(art.id)}
                            title={art.is_pinned ? 'Lepas Sematan' : 'Sematkan Karya Terbaik'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                              art.is_pinned
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                            <span>{art.is_pinned ? 'Disematkan' : 'Sematkan'}</span>
                          </button>
                        )}
                        <a
                          href={art.image_url}
                          download
                          onClick={() => playClickSound()}
                          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Unduh Karya"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {art.drive_web_link && (
                          <a
                            href={art.drive_web_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => playClickSound()}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-teal-600 dark:text-teal-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="Lihat di Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {art.comments.map((c) => (
                        <div
                          key={c.id}
                          className="text-xs bg-zinc-50 dark:bg-zinc-900/60 rounded-lg px-3 py-2"
                        >
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {c.author_name}
                          </span>{' '}
                          <span className="text-[11px] text-amber-700 dark:text-amber-400">
                            ({c.author_role === 'guru' ? 'Guru' : 'Siswa'})
                          </span>
                          <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">{c.content}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={(e) => handleAddComment(e, art.id)} className="flex gap-2">
                      <input
                        type="text"
                        value={commentInputs[art.id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [art.id]: e.target.value }))
                        }
                        placeholder="Tulis apresiasi atau masukan..."
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Kirim</span>
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== PRESENTASI SISWA ==================== */}
      {activeSubTab === 'presentations' && (
        <div className="space-y-6">
          {showPresUpload && (
            <form
              onSubmit={handleUploadPresentation}
              className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Unggah Berkas Presentasi Siswa (PDF, PPTX, HTML, atau Gambar Slide)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPresUpload(false)}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={presTitle}
                  onChange={(e) => setPresTitle(e.target.value)}
                  placeholder="Judul presentasi..."
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={presTopic}
                  onChange={(e) => setPresTopic(e.target.value)}
                  placeholder="Topik materi..."
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
                />
                <input
                  type="file"
                  accept=".pdf,.ppt,.pptx,.html,.png,.jpg,.jpeg"
                  required
                  onChange={(e) => setPresFile(e.target.files?.[0] || null)}
                  className="text-xs text-zinc-600 dark:text-zinc-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-zinc-100 dark:file:bg-zinc-800 file:font-semibold"
                />
              </div>
              <textarea
                rows={2}
                value={presDesc}
                onChange={(e) => setPresDesc(e.target.value)}
                placeholder="Ringkasan materi presentasi kelompok / individu..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm"
              />
              {presMessage && (
                <p className="text-xs font-medium text-teal-700 dark:text-teal-300">{presMessage}</p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={presUploading}
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {presUploading ? 'Mengunggah...' : 'Simpan & Tampilkan Presentasi'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {presentations.map((pres) => (
              <div
                key={pres.id}
                className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>{pres.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span>{pres.author_kelas}</span>
                  </div>
                  <h4 className="mt-2 text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                    {pres.title}
                  </h4>
                  <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Penyusun: {pres.author_name}
                  </p>
                  {pres.description && (
                    <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {pres.description}
                    </p>
                  )}
                  <p className="mt-3 font-mono text-[11px] text-zinc-500">
                    {pres.file_name} ({Math.max(1, Math.round(pres.file_size / 1024))} KB)
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setPreviewPres(pres);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tampilkan</span>
                  </button>
                  <a
                    href={pres.file_url}
                    download={pres.file_name}
                    onClick={() => playClickSound()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh</span>
                  </a>
                  {pres.drive_web_link && (
                    <a
                      href={pres.drive_web_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playClickSound()}
                      className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-teal-700 dark:text-teal-400"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Drive</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presentation Viewer Modal */}
      {previewPres && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-[#FAFAF8] dark:bg-[#111214]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100">
                {previewPres.title}
              </h3>
              <p className="text-xs text-zinc-500">
                Oleh {previewPres.author_name} ({previewPres.author_kelas})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={previewPres.file_url}
                download={previewPres.file_name}
                onClick={() => playClickSound()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Berkas</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setPreviewPres(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Tutup Pratinjau</span>
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 sm:p-6 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950">
            {previewPres.file_type.startsWith('image/') ? (
              <img
                src={previewPres.file_url}
                alt={previewPres.title}
                className="max-h-full max-w-full rounded-xl shadow-lg"
              />
            ) : previewPres.file_name.endsWith('.pdf') ||
              previewPres.file_name.endsWith('.html') ||
              previewPres.file_type.includes('pdf') ||
              previewPres.file_type.includes('html') ? (
              <iframe
                src={previewPres.file_url}
                title={previewPres.title}
                className="w-full max-w-5xl h-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white"
              />
            ) : (
              <div className="max-w-md text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-8">
                <FileText className="w-10 h-10 mx-auto text-teal-600" />
                <h4 className="mt-3 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {previewPres.file_name}
                </h4>
                <p className="mt-2 text-xs text-zinc-500">
                  Format PowerPoint (.ppt/.pptx) dapat diunduh langsung untuk dibuka di aplikasi presentasi perangkat Anda.
                </p>
                <a
                  href={previewPres.file_url}
                  download={previewPres.file_name}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-semibold"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Presentasi Sekarang</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
