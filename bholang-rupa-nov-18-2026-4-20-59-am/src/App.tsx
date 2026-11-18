import React, { useCallback, useEffect, useState } from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Bell,
  LogOut,
  LogIn,
  Menu,
  X,
  FolderOpen,
  ArrowRight,
  Compass,
} from 'lucide-react';
import type {
  Artwork,
  ExternalResourceView,
  ForumPost,
  NotificationItem,
  Presentation,
  QuizSubmission,
  User,
} from './types';
import {
  isSoundEnabled,
  playClickSound,
  playNotificationSound,
  setSoundEnabled,
} from './utils/sound';
import {
  initGoogleWorkspaceAuth,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
  TARGET_DRIVE_FOLDER_URL,
} from './services/googleWorkspace';
import { WelcomeModal } from './components/WelcomeModal';
import { AuthModal } from './components/AuthModal';
import { ExternalViewerModal } from './components/ExternalViewerModal';
import { LearningMaterials } from './components/LearningMaterials';
import { ArtLabSection } from './components/ArtLabSection';
import { GalleryAndPresentations } from './components/GalleryAndPresentations';
import { ForumSection } from './components/ForumSection';
import { QuizSection } from './components/QuizSection';
import { TeacherDashboard } from './components/TeacherDashboard';

type NavTab = 'materi' | 'lab' | 'komunitas' | 'kuis' | 'dashboard';
type CommunitySubTab = 'galeri' | 'forum';

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('materi');
  const [communityTab, setCommunityTab] = useState<CommunitySubTab>('galeri');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme & Audio State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('bholang_theme') === 'dark';
  });
  const [audioOn, setAudioOn] = useState<boolean>(isSoundEnabled());

  // Auth State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bholang_token'));
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Google Workspace State (in-memory token only via googleWorkspace.ts)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');

  // External Viewer Modal State
  const [externalResource, setExternalResource] = useState<ExternalResourceView | null>(null);

  // Live Data States
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  // Sync Tailwind .dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('bholang_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('bholang_theme', 'light');
    }
  }, [darkMode]);

  // Initialize Firebase Google Auth listener
  useEffect(() => {
    const unsub = initGoogleWorkspaceAuth(({ user: gUser, accessToken }) => {
      if (gUser && accessToken) {
        setGoogleEmail(gUser.email || gUser.displayName || 'Akun Google');
      } else {
        setGoogleEmail(null);
      }
    });
    return () => unsub();
  }, []);

  // Verify existing JWT token
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('bholang_token');
        setToken(null);
        setUser(null);
      });
  }, [token]);

  // Fetch initial datasets
  const fetchAllData = useCallback(async () => {
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [artRes, forumRes, presRes, settingsRes] = await Promise.all([
        fetch('/api/artworks', { headers }),
        fetch('/api/forum'),
        fetch('/api/presentations'),
        fetch('/api/settings/google'),
      ]);
      if (artRes.ok) {
        const d = await artRes.json();
        setArtworks(d.artworks || []);
      }
      if (forumRes.ok) {
        const d = await forumRes.json();
        setForumPosts(d.posts || []);
      }
      if (presRes.ok) {
        const d = await presRes.json();
        setPresentations(d.presentations || []);
      }
      if (settingsRes.ok) {
        const d = await settingsRes.json();
        setSpreadsheetId(d.settings?.google_spreadsheet_id || '');
        setSpreadsheetUrl(d.settings?.google_spreadsheet_url || '');
      }

      if (token) {
        const [subRes, notifRes] = await Promise.all([
          fetch('/api/quiz/submissions', { headers }),
          fetch('/api/notifications', { headers }),
        ]);
        if (subRes.ok) {
          const d = await subRes.json();
          setSubmissions(d.submissions || []);
        }
        if (notifRes.ok) {
          const d = await notifRes.json();
          setNotifications(d.notifications || []);
        }
      } else {
        setSubmissions([]);
        setNotifications([]);
      }
    } catch {
      // Ignore transient network errors
    }
  }, [token]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-Time WebSocket Client with Auto-Reconnect
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let closedByUnmount = false;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

      ws.onmessage = (ev) => {
        try {
          const { event, payload } = JSON.parse(ev.data) as {
            event: string;
            payload: unknown;
          };

          if (event === 'artwork:created') {
            const newArt = payload as Artwork;
            setArtworks((prev) => (prev.some((a) => a.id === newArt.id) ? prev : [newArt, ...prev]));
          } else if (event === 'artwork:liked') {
            const { artworkId, likes_count } = payload as {
              artworkId: number;
              likes_count: number;
            };
            setArtworks((prev) =>
              prev.map((a) => (a.id === artworkId ? { ...a, likes_count } : a))
            );
          } else if (event === 'artwork:appreciated') {
            const { artworkId, appreciation } = payload as {
              artworkId: number;
              appreciation: Artwork['appreciations'][number];
            };
            setArtworks((prev) =>
              prev.map((a) =>
                a.id === artworkId && !a.appreciations.some((ap) => ap.id === appreciation.id)
                  ? { ...a, appreciations: [appreciation, ...a.appreciations] }
                  : a
              )
            );
          } else if (event === 'artwork:commented') {
            const { artworkId, comment } = payload as {
              artworkId: number;
              comment: Artwork['comments'][number];
            };
            setArtworks((prev) =>
              prev.map((a) =>
                a.id === artworkId && !a.comments.some((c) => c.id === comment.id)
                  ? { ...a, comments: [...a.comments, comment] }
                  : a
              )
            );
          } else if (event === 'artwork:pinned') {
            const { artworkId, is_pinned } = payload as {
              artworkId: number;
              is_pinned: boolean;
            };
            setArtworks((prev) =>
              prev
                .map((a) => (a.id === artworkId ? { ...a, is_pinned } : a))
                .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || b.id - a.id)
            );
          } else if (event === 'forum:new_post') {
            const post = payload as ForumPost;
            setForumPosts((prev) => (prev.some((p) => p.id === post.id) ? prev : [post, ...prev]));
          } else if (event === 'forum:new_reply') {
            const { postId, reply } = payload as {
              postId: number;
              reply: ForumPost['replies'][number];
            };
            setForumPosts((prev) =>
              prev.map((p) =>
                p.id === postId && !p.replies.some((r) => r.id === reply.id)
                  ? { ...p, replies: [...p.replies, reply] }
                  : p
              )
            );
          } else if (event === 'forum:deleted') {
            const { postId } = payload as { postId: number };
            setForumPosts((prev) => prev.filter((p) => p.id !== postId));
          } else if (event === 'presentation:created') {
            const pres = payload as Presentation;
            setPresentations((prev) =>
              prev.some((p) => p.id === pres.id) ? prev : [pres, ...prev]
            );
          } else if (event === 'quiz:submitted' || event === 'quiz:updated') {
            fetchAllData();
          } else if (event === 'notification:new') {
            const notif = payload as NotificationItem;
            setNotifications((prev) =>
              prev.some((n) => n.id === notif.id) ? prev : [notif, ...prev.slice(0, 29)]
            );
            playNotificationSound();
          }
        } catch {
          // ignore malformed WS frames
        }
      };

      ws.onclose = () => {
        if (!closedByUnmount) {
          reconnectTimer = window.setTimeout(connect, 2500);
        }
      };
    };

    connect();
    return () => {
      closedByUnmount = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [fetchAllData]);

  const handleAuthenticated = (newToken: string, newUser: User) => {
    localStorage.setItem('bholang_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    playClickSound();
    localStorage.removeItem('bholang_token');
    setToken(null);
    setUser(null);
  };

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithGoogleWorkspace();
      setGoogleEmail(res.user.email || res.user.displayName || 'Terhubung');
    } catch {
      // User closed popup or denied
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
  };

  const handleNavigate = (tab: NavTab, subTab?: CommunitySubTab) => {
    playClickSound();
    setActiveTab(tab);
    if (subTab) setCommunityTab(subTab);
    setMobileMenuOpen(false);
  };

  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF8] text-zinc-900 dark:bg-[#111214] dark:text-zinc-100">
      {/* Welcome Modal */}
      <WelcomeModal open={showWelcome} onEnter={() => setShowWelcome(false)} />

      {/* Auth Modal */}
      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={handleAuthenticated}
        googleConnectedEmail={googleEmail}
        onGoogleSignIn={handleGoogleSignIn}
      />

      {/* External Resource Viewer Modal */}
      <ExternalViewerModal
        resource={externalResource}
        onClose={() => setExternalResource(null)}
      />

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 dark:border-zinc-800 bg-[#FAFAF8]/95 dark:bg-[#111214]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavigate('materi')}
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            BHOLANG RUPA
          </button>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {[
              { id: 'materi', label: 'Materi' },
              { id: 'lab', label: 'Lab Seni' },
              { id: 'komunitas', label: 'Galeri & Forum' },
              { id: 'kuis', label: 'Kuis' },
              { id: 'dashboard', label: 'Dashboard' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id as NavTab)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  activeTab === item.id
                    ? 'border-amber-600 text-zinc-900 dark:text-zinc-50 font-semibold'
                    : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: 1 Primary CTA + Mobile Menu Button */}
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer max-w-[190px]"
              >
                <span className="truncate">{user.name.split(' ')[0]} · Keluar</span>
                <LogOut className="w-3.5 h-3.5 shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setAuthModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Akun</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                playClickSound();
                setMobileMenuOpen((v) => !v);
              }}
              className="md:hidden p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 cursor-pointer"
              aria-label="Menu Navigasi"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] px-4 py-3 space-y-1">
            {[
              { id: 'materi', label: 'Materi Pembelajaran' },
              { id: 'lab', label: 'Demo & Lab Seni Digital' },
              { id: 'komunitas', label: 'Galeri, Presentasi & Forum' },
              { id: 'kuis', label: 'Kuis & Evaluasi' },
              { id: 'dashboard', label: 'Dashboard Guru' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id as NavTab)}
                className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Workspace Utility Strip (below header, keeps top bar ultra-clean) */}
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-[#15171B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span>Kelas X SMK</span>
            <span aria-hidden="true">·</span>
            <span>Unsur-Unsur &amp; Prinsip Seni Rupa</span>
            {user && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                  {user.name} ({user.role === 'guru' ? 'Guru' : user.kelas})
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Workspace Connection */}
            {googleEmail ? (
              <div className="inline-flex items-center gap-2">
                <a
                  href={TARGET_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playClickSound()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 font-medium"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="max-w-[160px] truncate">Drive: {googleEmail}</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    signOutGoogleWorkspace();
                  }}
                  className="px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Putus
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  handleGoogleSignIn();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                <span>Hubungkan Google Drive &amp; Sheets</span>
              </button>
            )}

            {/* Real-Time Notification Trigger (for logged-in users) */}
            {user && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setNotifDropdownOpen((v) => !v);
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                  aria-label="Notifikasi"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span className="font-mono tabular-nums">{unreadNotifs}</span>
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] shadow-xl p-3 z-40 space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        Notifikasi Terbaru
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          handleMarkAllRead();
                        }}
                        className="text-[11px] font-semibold text-amber-600 hover:underline cursor-pointer"
                      >
                        Tandai Dibaca
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
                      {notifications.length === 0 ? (
                        <p className="text-zinc-500 py-3 text-center">Belum ada notifikasi.</p>
                      ) : (
                        notifications.slice(0, 8).map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setNotifDropdownOpen(false);
                              if (n.target_tab === 'gallery') handleNavigate('komunitas', 'galeri');
                              else if (n.target_tab === 'forum') handleNavigate('komunitas', 'forum');
                              else if (n.target_tab === 'dashboard') handleNavigate('dashboard');
                            }}
                            className={`w-full text-left rounded-lg p-2 transition-colors cursor-pointer ${
                              n.is_read
                                ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                                : 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70'
                            }`}
                          >
                            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {n.title}
                            </p>
                            <p className="text-zinc-600 dark:text-zinc-400 line-clamp-2">
                              {n.message}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !audioOn;
                setSoundEnabled(next);
                setAudioOn(next);
                if (next) playClickSound();
              }}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title={audioOn ? 'Matikan Audio Klik' : 'Aktifkan Audio Klik'}
              aria-label="Toggle Audio Klik"
            >
              {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setDarkMode((d) => !d);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{darkMode ? 'Terang' : 'Gelap'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Overview on Materi Tab */}
        {activeTab === 'materi' && (
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Studio Pembelajaran Seni Budaya · Kelas X SMK
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight text-balance">
                Kuasai Unsur-Unsur &amp; Prinsip Seni Rupa Melalui Eksplorasi Nyata
              </h1>
              <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
                Pelajari konsep visual dari slide presentasi, e-book Kemendikdasmen, dan video pembelajaran, lalu praktikkan langsung di Laboratorium Kanvas Digital &amp; Spektrum Warna.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleNavigate('lab')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold cursor-pointer"
                >
                  <span>Buka Lab Seni Digital</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setExternalResource({
                      title: 'Mari Berpetualang — Artventure Unsur Rupa & Prinsip Desain',
                      subtitle: 'Gim Edukasi Kemendikdasmen',
                      url: 'https://murid.kemendikdasmen.go.id/sumber-belajar/materi/Gim%20Edukasi/artventure-unsur-rupa-prinsip-desain-4c880e67-04d4-4b25-933f-07056949c099',
                      embedType: 'iframe',
                    });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Mari Berpetualang</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 min-h-[240px] relative bg-zinc-100 dark:bg-zinc-900">
              <img
                src="/src/assets/images/hero_atelier_rupa_1794949804649.jpg"
                alt="Meja kerja studio seni rupa BHOLANG RUPA"
                referrerPolicy="no-referrer"
                className="w-full h-full lg:h-full object-cover"
              />
            </div>
          </section>
        )}

        {/* Active Views */}
        {activeTab === 'materi' && (
          <LearningMaterials onOpenExternal={(res) => setExternalResource(res)} />
        )}

        {activeTab === 'lab' && (
          <ArtLabSection
            user={user}
            token={token}
            onRequireAuth={() => setAuthModalOpen(true)}
            onOpenExternal={(res) => setExternalResource(res)}
            onArtworkPublished={fetchAllData}
          />
        )}

        {activeTab === 'komunitas' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  Ruang Kolaborasi, Galeri Kelas &amp; Forum Diskusi
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Apresiasi karya teman sekelas, unggah presentasi kelompok, dan berdiskusi dua arah dengan guru.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setCommunityTab('galeri');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    communityTab === 'galeri'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Galeri &amp; Presentasi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setCommunityTab('forum');
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    communityTab === 'forum'
                      ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  Forum Diskusi ({forumPosts.length})
                </button>
              </div>
            </div>

            {communityTab === 'galeri' ? (
              <GalleryAndPresentations
                user={user}
                token={token}
                artworks={artworks}
                presentations={presentations}
                onRequireAuth={() => setAuthModalOpen(true)}
                onRefresh={fetchAllData}
              />
            ) : (
              <ForumSection
                user={user}
                token={token}
                posts={forumPosts}
                onRequireAuth={() => setAuthModalOpen(true)}
              />
            )}
          </div>
        )}

        {activeTab === 'kuis' && (
          <QuizSection
            user={user}
            token={token}
            submissions={submissions}
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            onSpreadsheetReady={(id, url) => {
              setSpreadsheetId(id);
              setSpreadsheetUrl(url);
            }}
            onRequireAuth={() => setAuthModalOpen(true)}
            onGoogleSignIn={handleGoogleSignIn}
            onOpenExternal={(res) => setExternalResource(res)}
            onSubmitted={fetchAllData}
          />
        )}

        {activeTab === 'dashboard' && (
          <TeacherDashboard
            user={user}
            token={token}
            notifications={notifications}
            googleUserEmail={googleEmail}
            spreadsheetId={spreadsheetId}
            spreadsheetUrl={spreadsheetUrl}
            onSpreadsheetReady={(id, url) => {
              setSpreadsheetId(id);
              setSpreadsheetUrl(url);
            }}
            onGoogleSignIn={handleGoogleSignIn}
            onMarkAllRead={handleMarkAllRead}
            onRequireAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <p>
            © 2026 BHOLANG RUPA · Media Pembelajaran Interaktif Seni Rupa Kelas X SMK
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setShowWelcome(true);
              }}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
            >
              Tampilkan Sambutan Awal
            </button>
            <a
              href={TARGET_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playClickSound()}
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Folder Arsip Google Drive
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
