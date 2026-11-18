import React, { useState } from 'react';
import { X, LogIn, UserPlus, GraduationCap, Users } from 'lucide-react';
import type { User } from '../types';
import { playClickSound, playSuccessSound } from '../utils/sound';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (token: string, user: User) => void;
  googleConnectedEmail?: string | null;
  onGoogleSignIn: () => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  open,
  onClose,
  onAuthenticated,
  googleConnectedEmail,
  onGoogleSignIn,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'siswa' | 'guru'>('siswa');
  const [kelas, setKelas] = useState('X DKV 1');
  const [nisNip, setNisNip] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { name, email, password, role, kelas, nis_nip: nisNip };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan autentikasi.');
        return;
      }
      playSuccessSound();
      onAuthenticated(data.token, data.user);
      onClose();
    } catch {
      setError('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  const quickFillDemo = async (demoEmail: string, demoPassword: string) => {
    playClickSound();
    setMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        playSuccessSound();
        onAuthenticated(data.token, data.user);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {mode === 'login' ? 'Masuk Akun BHOLANG RUPA' : 'Daftar Akun Baru'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Akses penuh Galeri, Forum, Presentasi, Kuis &amp; Dashboard Guru
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mt-4 grid grid-cols-2 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode('login');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setMode('register');
              setError('');
            }}
            className={`py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Daftar Siswa / Guru
          </button>
        </div>

        {/* Quick Demo Accounts */}
        <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-3">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-2">
            Masuk Cepat Akun Kelas:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => quickFillDemo('guru@bholangrupa.sch.id', 'guru123')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Akun Guru</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => quickFillDemo('siswa@bholangrupa.sch.id', 'siswa123')}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-teal-300 dark:border-teal-700/60 bg-teal-50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/40 cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Akun Siswa</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Raka Aditya"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Peran
                  </label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const val = e.target.value as 'siswa' | 'guru';
                      setRole(val);
                      setKelas(val === 'guru' ? 'Pengampu Seni Rupa' : 'X DKV 1');
                    }}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="siswa">Siswa</option>
                    <option value="guru">Guru</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {role === 'guru' ? 'Mata Pelajaran' : 'Kelas SMK'}
                  </label>
                  <input
                    type="text"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    placeholder="X DKV 1"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  NIS / NIP (Opsional)
                </label>
                <input
                  type="text"
                  value={nisNip}
                  onChange={(e) => setNisNip(e.target.value)}
                  placeholder="20261009"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@sekolah.sch.id"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 4 karakter"
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
          >
            {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{loading ? 'Memproses...' : mode === 'login' ? 'Masuk ke Akun' : 'Buat Akun Sekarang'}</span>
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            Integrasi Google Drive &amp; Google Sheets:
          </p>
          {googleConnectedEmail ? (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Terhubung dengan Google: {googleConnectedEmail}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => {
                playClickSound();
                onGoogleSignIn();
              }}
              className="gsi-material-button w-full"
            >
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    <path fill="none" d="M0 0h48v48H0z" />
                  </svg>
                </div>
                <span className="gsi-material-button-contents">Sign in with Google</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
