import React, { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Download,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  FolderOpen,
  RefreshCw,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import type {
  Artwork,
  NotificationItem,
  Presentation,
  QuizSubmission,
  User,
} from '../types';
import { playClickSound, playSuccessSound } from '../utils/sound';
import { downloadQuizPdfReport } from '../utils/pdfReport';
import {
  appendGradeRowToSheet,
  ensureGradeSpreadsheet,
  getGoogleAccessToken,
  listDriveFolderFiles,
  TARGET_DRIVE_FOLDER_ID,
  TARGET_DRIVE_FOLDER_URL,
  type DriveFileResult,
} from '../services/googleWorkspace';

interface StudentSummary {
  id: number;
  name: string;
  email: string;
  kelas: string;
  nis_nip: string;
  artwork_count: number;
  presentation_count: number;
  quiz_count: number;
  latest_mc_score: number;
  latest_essay_score: number;
  latest_final_score: number;
  predicate: string;
}

interface TeacherDashboardProps {
  user: User | null;
  token: string | null;
  notifications: NotificationItem[];
  googleUserEmail: string | null;
  spreadsheetId: string;
  spreadsheetUrl: string;
  onSpreadsheetReady: (id: string, url: string) => void;
  onGoogleSignIn: () => Promise<void>;
  onMarkAllRead: () => void;
  onRequireAuth: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  token,
  notifications,
  googleUserEmail,
  spreadsheetId,
  spreadsheetUrl,
  onSpreadsheetReady,
  onGoogleSignIn,
  onMarkAllRead,
  onRequireAuth,
}) => {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [submissions, setSubmissions] = useState<QuizSubmission[]>([]);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Essay score editor modal
  const [editingSub, setEditingSub] = useState<QuizSubmission | null>(null);
  const [editScores, setEditScores] = useState<number[]>([0, 0, 0, 0, 0]);
  const [editNote, setEditNote] = useState('');

  // Drive browser state
  const [driveFiles, setDriveFiles] = useState<DriveFileResult[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState('');

  const loadDashboard = async () => {
    if (!token || user?.role !== 'guru') return;
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setStudents(data.students || []);
      setArtworks(data.artworks || []);
      setPresentations(data.presentations || []);
      setSubmissions(data.submissions || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [token, user?.role, notifications.length]);

  const loadDriveFiles = async () => {
    const gToken = getGoogleAccessToken();
    if (!gToken) return;
    setDriveLoading(true);
    try {
      const files = await listDriveFolderFiles(gToken, TARGET_DRIVE_FOLDER_ID);
      setDriveFiles(files);
      setSyncNotice('');
    } catch (err) {
      setSyncNotice(err instanceof Error ? err.message : 'Gagal memuat isi folder Google Drive.');
    } finally {
      setDriveLoading(false);
    }
  };

  useEffect(() => {
    if (googleUserEmail && getGoogleAccessToken()) {
      loadDriveFiles();
    }
  }, [googleUserEmail]);

  if (!user) {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-10 text-center space-y-3">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Dashboard Guru BHOLANG RUPA
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          Silakan masuk menggunakan akun Guru (contoh: guru@bholangrupa.sch.id) untuk melihat rekap nilai siswa, grafik perbandingan belajar, notifikasi real-time, dan integrasi Google Drive.
        </p>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onRequireAuth();
          }}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
        >
          Masuk Akun Guru
        </button>
      </div>
    );
  }

  if (user.role !== 'guru') {
    return (
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-10 text-center space-y-3">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Area Khusus Guru Pengampu
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
          Anda sedang masuk sebagai <strong>{user.name} (Siswa {user.kelas})</strong>. Siswa dapat melihat nilai dan mengunduh laporan PDF di menu <strong>Kuis</strong> serta mengunggah karya di <strong>Lab Seni</strong> &amp; <strong>Galeri</strong>. Untuk mengakses Dashboard Guru, silakan masuk dengan akun Guru.
        </p>
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onRequireAuth();
          }}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
        >
          Ganti ke Akun Guru
        </button>
      </div>
    );
  }

  const gradedStudents = students.filter((s) => s.quiz_count > 0);
  const avgScore =
    gradedStudents.length > 0
      ? (
          gradedStudents.reduce((sum, s) => sum + s.latest_final_score, 0) / gradedStudents.length
        ).toFixed(1)
      : '0.0';
  const passedCount = gradedStudents.filter((s) => s.latest_final_score >= 75).length;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleOpenEditEssay = (sub: QuizSubmission) => {
    playClickSound();
    let parsed = [0, 0, 0, 0, 0];
    try {
      parsed = JSON.parse(sub.essay_scores_json || '[0,0,0,0,0]');
    } catch {
      parsed = [0, 0, 0, 0, 0];
    }
    setEditingSub(sub);
    setEditScores(parsed);
    setEditNote(sub.teacher_note || '');
  };

  const handleSaveEssayEdit = async () => {
    if (!editingSub || !token) return;
    playClickSound();
    const res = await fetch(`/api/quiz/submissions/${editingSub.id}/essay-score`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ essayScores: editScores, teacherNote: editNote }),
    });
    if (res.ok) {
      playSuccessSound();
      setEditingSub(null);
      loadDashboard();
    }
  };

  const handleBulkSyncSheets = async () => {
    playClickSound();
    let gToken = getGoogleAccessToken();
    if (!gToken) {
      await onGoogleSignIn();
      gToken = getGoogleAccessToken();
    }
    if (!gToken || !token) return;

    setSyncNotice('Menyinkronkan seluruh rekap nilai ke Google Spreadsheet...');
    try {
      const sheetInfo = await ensureGradeSpreadsheet(
        gToken,
        spreadsheetId || undefined,
        TARGET_DRIVE_FOLDER_ID
      );
      onSpreadsheetReady(sheetInfo.spreadsheetId, sheetInfo.spreadsheetUrl);
      await fetch('/api/settings/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          google_spreadsheet_id: sheetInfo.spreadsheetId,
          google_spreadsheet_url: sheetInfo.spreadsheetUrl,
        }),
      });

      const unsynced = submissions.filter((s) => !s.sheets_synced);
      const targets = unsynced.length > 0 ? unsynced : submissions;
      for (const sub of targets) {
        await appendGradeRowToSheet(gToken, sheetInfo.spreadsheetId, sheetInfo.sheetTitle, [
          new Date(sub.created_at).toLocaleString('id-ID'),
          sub.student_name,
          sub.student_kelas,
          sub.student_email,
          `${sub.mc_correct}/${sub.mc_total}`,
          sub.mc_score,
          sub.essay_score,
          sub.final_score,
          sub.predicate,
          sub.teacher_note || '-',
        ]);
        await fetch(`/api/quiz/submissions/${sub.id}/sync`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sheets_synced: true }),
        });
      }
      playSuccessSound();
      setSyncNotice(`Berhasil merekap ${targets.length} data nilai siswa ke Google Spreadsheet.`);
      loadDashboard();
    } catch (err) {
      setSyncNotice(err instanceof Error ? err.message : 'Gagal sinkronisasi ke Google Sheets.');
    }
  };

  return (
    <section className="space-y-8">
      {/* 1. KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Siswa Terdaftar</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {students.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Kelas X SMK</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Rata-Rata Nilai Kuis</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {avgScore}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {passedCount}/{gradedStudents.length} tuntas (KKM 75)
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Karya &amp; Presentasi</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400">
            {artworks.length + presentations.length}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {artworks.length} karya · {presentations.length} presentasi
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Notifikasi Baru</p>
          <p className="mt-1 text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {unreadCount}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Pembaruan real-time</p>
        </div>
      </div>

      {/* 2. Bar Chart + Real-Time Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Grafik Batang Perbandingan Hasil Belajar */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Visualisasi Capaian Kompetensi
              </p>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Grafik Batang Perbandingan Hasil Belajar Siswa
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block" /> Skor PG
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block" /> Nilai Akhir
              </span>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            {students.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center">Belum ada data siswa.</p>
            ) : (
              <svg
                viewBox={`0 0 ${Math.max(520, students.length * 130)} 260`}
                className="w-full min-w-[480px] h-[250px]"
              >
                {/* Y-axis grid lines */}
                {[0, 25, 50, 75, 100].map((val) => {
                  const y = 210 - (val / 100) * 180;
                  return (
                    <g key={val}>
                      <line
                        x1="40"
                        y1={y}
                        x2={Math.max(500, students.length * 130 - 20)}
                        y2={y}
                        stroke={val === 75 ? '#DC2626' : '#E4E4E7'}
                        strokeDasharray={val === 75 ? '4 4' : undefined}
                        strokeWidth="1"
                        className={val === 75 ? '' : 'dark:stroke-zinc-800'}
                      />
                      <text
                        x="32"
                        y={y + 4}
                        textAnchor="end"
                        fontSize="10"
                        fill="currentColor"
                        className="text-zinc-400 font-mono"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
                <text
                  x={Math.max(495, students.length * 130 - 24)}
                  y={210 - (75 / 100) * 180 - 5}
                  textAnchor="end"
                  fontSize="9"
                  fill="#DC2626"
                  fontWeight="600"
                >
                  KKM 75
                </text>

                {students.map((st, idx) => {
                  const groupX = 68 + idx * 124;
                  const mcH = (st.latest_mc_score / 100) * 180;
                  const finalH = (st.latest_final_score / 100) * 180;
                  const isHovered = hoveredBar === st.id;
                  return (
                    <g
                      key={st.id}
                      onMouseEnter={() => setHoveredBar(st.id)}
                      onMouseLeave={() => setHoveredBar(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={groupX}
                        y={210 - mcH}
                        width="28"
                        height={mcH}
                        rx="4"
                        fill="#0D9488"
                        opacity={isHovered ? 1 : 0.85}
                      />
                      <rect
                        x={groupX + 34}
                        y={210 - finalH}
                        width="28"
                        height={finalH}
                        rx="4"
                        fill="#D97706"
                        opacity={isHovered ? 1 : 0.92}
                      />
                      <text
                        x={groupX + 48}
                        y={210 - finalH - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="currentColor"
                        className="text-zinc-800 dark:text-zinc-200 font-mono"
                      >
                        {st.latest_final_score}
                      </text>
                      <text
                        x={groupX + 31}
                        y="228"
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="600"
                        fill="currentColor"
                        className="text-zinc-700 dark:text-zinc-300"
                      >
                        {st.name.split(' ')[0]}
                      </text>
                      <text
                        x={groupX + 31}
                        y="242"
                        textAnchor="middle"
                        fontSize="9"
                        fill="currentColor"
                        className="text-zinc-400"
                      >
                        {st.kelas}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* Real-Time Notifications Panel */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Notifikasi Real-Time Aktivitas Siswa
              </h3>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onMarkAllRead();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tandai Dibaca</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-zinc-500">Belum ada aktivitas masuk.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 text-xs ${
                    n.is_read
                      ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30'
                      : 'border-amber-300 dark:border-amber-800/70 bg-amber-50/70 dark:bg-amber-950/25'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{n.title}</span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {new Date(n.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 3. Daftar Siswa & Perkembangan Belajar */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Daftar Siswa, Hasil Pekerjaan &amp; Rekap Nilai
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Pantau progres portofolio karya, presentasi, serta skor evaluasi setiap siswa
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkSyncSheets}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Sinkronkan ke Google Sheets</span>
            </button>
            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span>Buka Sheets</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {syncNotice && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3.5 py-2">
            {syncNotice}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
              <tr>
                <th className="py-2.5 pr-4">Nama Siswa</th>
                <th className="py-2.5 pr-4">Kelas</th>
                <th className="py-2.5 pr-4">Karya</th>
                <th className="py-2.5 pr-4">Presentasi</th>
                <th className="py-2.5 pr-4">Nilai PG</th>
                <th className="py-2.5 pr-4">Nilai Esai</th>
                <th className="py-2.5 pr-4">Nilai Akhir</th>
                <th className="py-2.5">Predikat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {students.map((st) => (
                <tr key={st.id}>
                  <td className="py-3 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                    {st.name}
                    <div className="text-[11px] font-normal text-zinc-500">{st.email}</div>
                  </td>
                  <td className="py-3 pr-4">{st.kelas}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{st.artwork_count}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{st.presentation_count}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{st.latest_mc_score}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{st.latest_essay_score}</td>
                  <td className="py-3 pr-4 font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    {st.latest_final_score}
                  </td>
                  <td className="py-3">{st.predicate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Detailed Quiz Submissions with Teacher Essay Adjustment & PDF Download */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Detail Kiriman Evaluasi &amp; Ekspor Laporan PDF
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Siswa</th>
                  <th className="py-2 pr-4">Benar PG</th>
                  <th className="py-2 pr-4">Esai</th>
                  <th className="py-2 pr-4">Akhir</th>
                  <th className="py-2 pr-4">Catatan Guru</th>
                  <th className="py-2 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-2.5 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      {sub.student_name}{' '}
                      <span className="font-normal text-zinc-500">({sub.student_kelas})</span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">
                      {sub.mc_correct}/{sub.mc_total} ({sub.mc_score})
                    </td>
                    <td className="py-2.5 pr-4 font-mono tabular-nums">{sub.essay_score}</td>
                    <td className="py-2.5 pr-4 font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {sub.final_score}
                    </td>
                    <td className="py-2.5 pr-4 text-zinc-500 max-w-xs truncate">
                      {sub.teacher_note || '-'}
                    </td>
                    <td className="py-2.5 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenEditEssay(sub)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Nilai Esai</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          downloadQuizPdfReport(sub);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold cursor-pointer"
                      >
                        <FileDown className="w-3 h-3" />
                        <span>Unduh PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Akses Unduh Karya, Presentasi & Integrasi Folder Google Drive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 space-y-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Unduh Karya &amp; Presentasi Siswa
          </h3>
          <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
            {artworks.map((a) => (
              <div
                key={`art-${a.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    [Karya] {a.title}
                  </p>
                  <p className="text-zinc-500">
                    {a.author_name} · {a.author_kelas}
                  </p>
                </div>
                <a
                  href={a.image_url}
                  download
                  onClick={() => playClickSound()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </a>
              </div>
            ))}
            {presentations.map((p) => (
              <div
                key={`pres-${p.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3.5 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    [Presentasi] {p.title}
                  </p>
                  <p className="text-zinc-500">
                    {p.author_name} · {p.file_name}
                  </p>
                </div>
                <a
                  href={p.file_url}
                  download={p.file_name}
                  onClick={() => playClickSound()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Google Drive Target Folder Browser */}
        <div className="lg:col-span-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Folder Google Drive Kelas Terorganisasi
              </h3>
              <p className="font-mono text-[11px] text-zinc-500">
                ID Folder: {TARGET_DRIVE_FOLDER_ID}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={TARGET_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playClickSound()}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Buka Drive</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  loadDriveFiles();
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${driveLoading ? 'animate-spin' : ''}`} />
                <span>Muat</span>
              </button>
            </div>
          </div>

          {!googleUserEmail ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 space-y-3 text-xs">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Petunjuk Integrasi Google Drive &amp; Google Sheets:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                <li>Klik tombol <strong>Sign in with Google</strong> di bawah untuk memberi izin akses Google Drive &amp; Sheets.</li>
                <li>Aplikasi otomatis membuat subfolder <code className="font-mono">01_Karya_Siswa</code>, <code className="font-mono">02_Presentasi_Siswa</code>, dan <code className="font-mono">03_Hasil_Kuis_dan_Nilai</code> di dalam folder tujuan.</li>
                <li>Setiap kiriman siswa akan tersimpan otomatis dan terekap ke Spreadsheet guru.</li>
              </ol>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onGoogleSignIn();
                }}
                className="gsi-material-button"
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
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {driveFiles.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Belum ada file di folder ini atau klik &ldquo;Muat&rdquo; untuk menyegarkan daftar dari Google Drive.
                </p>
              ) : (
                driveFiles.map((df) => (
                  <div
                    key={df.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {df.mimeType === 'application/vnd.google-apps.folder' ? '📁 ' : '📄 '}
                      {df.name}
                    </span>
                    {df.webViewLink && (
                      <a
                        href={df.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 dark:text-teal-400 font-semibold shrink-0 hover:underline"
                      >
                        Buka
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Essay Score Editor Modal */}
      {editingSub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Penilaian Esai: {editingSub.student_name}
                </h3>
                <p className="text-xs text-zinc-500">Skor tiap soal esai 0–20 (total 100)</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {editScores.map((val, idx) => (
                <div key={idx}>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1">
                    Esai {idx + 1}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={val}
                    onChange={(e) => {
                      const next = [...editScores];
                      next[idx] = Math.max(0, Math.min(20, Number(e.target.value) || 0));
                      setEditScores(next);
                    }}
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm font-mono text-center"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Catatan Evaluasi Guru
              </label>
              <textarea
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Beri masukan konstruktif untuk siswa..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEssayEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Nilai</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
