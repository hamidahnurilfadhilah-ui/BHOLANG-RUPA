import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  Send,
  ClipboardList,
  RotateCcw,
} from 'lucide-react';
import type { ExternalResourceView, QuizSubmission, User } from '../types';
import { playClickSound, playSuccessSound } from '../utils/sound';
import { buildQuizPdfBlob, downloadQuizPdfReport } from '../utils/pdfReport';
import {
  appendGradeRowToSheet,
  ensureGradeSpreadsheet,
  getGoogleAccessToken,
  TARGET_DRIVE_FOLDER_ID,
  uploadBlobToDrive,
} from '../services/googleWorkspace';

interface QuizMcPublic {
  id: number;
  topic: string;
  question: string;
  options: [string, string, string, string];
}

interface QuizEssayPublic {
  id: number;
  topic: string;
  question: string;
  maxScore: number;
}

interface QuizSectionProps {
  user: User | null;
  token: string | null;
  submissions: QuizSubmission[];
  spreadsheetId: string;
  spreadsheetUrl: string;
  onSpreadsheetReady: (id: string, url: string) => void;
  onRequireAuth: () => void;
  onGoogleSignIn: () => Promise<void>;
  onOpenExternal: (res: ExternalResourceView) => void;
  onSubmitted: () => void;
}

const WAYGROUND_URL = 'https://wayground.com/activity/admin/quiz/6ad8fbc355bf171aa987d635';

export const QuizSection: React.FC<QuizSectionProps> = ({
  user,
  token,
  submissions,
  spreadsheetId,
  spreadsheetUrl,
  onSpreadsheetReady,
  onRequireAuth,
  onGoogleSignIn,
  onOpenExternal,
  onSubmitted,
}) => {
  const [mcQuestions, setMcQuestions] = useState<QuizMcPublic[]>([]);
  const [essayQuestions, setEssayQuestions] = useState<QuizEssayPublic[]>([]);
  const [mcAnswers, setMcAnswers] = useState<Record<string, number>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [activePart, setActivePart] = useState<'mc' | 'essay'>('mc');
  const [submitting, setSubmitting] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [result, setResult] = useState<{
    submission: QuizSubmission;
    mcFeedback: Array<{
      id: number;
      selected?: number;
      correctIndex: number;
      isCorrect: boolean;
      explanation: string;
    }>;
    essayFeedback: Array<{
      id: number;
      score: number;
      maxScore: number;
      matchedKeywords: string[];
      sampleAnswer: string;
    }>;
  } | null>(null);

  useEffect(() => {
    fetch('/api/quiz/questions')
      .then((r) => r.json())
      .then((data) => {
        setMcQuestions(data.multipleChoice || []);
        setEssayQuestions(data.essays || []);
      })
      .catch(() => {});
  }, []);

  const mcAnsweredCount = Object.keys(mcAnswers).length;
  const essayAnsweredCount = Object.values(essayAnswers).filter((v) => v.trim().length > 0).length;

  const syncSubmissionToWorkspace = async (sub: QuizSubmission) => {
    const googleToken = getGoogleAccessToken();
    if (!googleToken || !token) return false;

    setSyncMessage('Menyinkronkan nilai ke Google Spreadsheet dan mengarsipkan PDF ke Google Drive...');
    try {
      const sheetInfo = await ensureGradeSpreadsheet(
        googleToken,
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

      await appendGradeRowToSheet(googleToken, sheetInfo.spreadsheetId, sheetInfo.sheetTitle, [
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

      const pdfBlob = buildQuizPdfBlob(sub);
      const pdfFileName = `Nilai_${sub.student_kelas}_${sub.student_name}_${sub.id}.pdf`.replace(/\s+/g, '_');
      const driveRes = await uploadBlobToDrive(googleToken, {
        blob: pdfBlob,
        fileName: pdfFileName,
        mimeType: 'application/pdf',
        categoryFolder: '03_Hasil_Kuis_dan_Nilai',
        rootFolderId: TARGET_DRIVE_FOLDER_ID,
      });

      await fetch(`/api/quiz/submissions/${sub.id}/sync`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sheets_synced: true,
          drive_file_id: driveRes.id,
          drive_web_link: driveRes.webViewLink || '',
        }),
      });

      setSyncMessage('Nilai berhasil terekap otomatis di Google Sheets dan PDF tersimpan di Google Drive!');
      onSubmitted();
      return true;
    } catch (err) {
      setSyncMessage(
        err instanceof Error ? err.message : 'Gagal menyinkronkan ke Google Sheets/Drive.'
      );
      return false;
    }
  };

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    setSubmitting(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mcAnswers, essayAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim jawaban kuis.');

      playSuccessSound();
      setResult(data);
      onSubmitted();

      // Auto-sync to Google Sheets & Drive if Google account is already signed in
      if (getGoogleAccessToken()) {
        await syncSubmissionToWorkspace(data.submission);
      } else {
        setSyncMessage(
          'Nilai tersimpan di database BHOLANG RUPA. Hubungkan akun Google untuk mengirim rekap otomatis ke Google Sheets & Drive.'
        );
      }
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Terjadi kesalahan saat menilai.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetQuiz = () => {
    playClickSound();
    setMcAnswers({});
    setEssayAnswers({});
    setResult(null);
    setActivePart('mc');
    setSyncMessage('');
  };

  return (
    <section className="space-y-8">
      {/* 1. Wayground External Quiz Integration */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8">
          <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
            Kuis Interaktif Eksternal · Wayground
          </p>
          <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Latihan Kuis Gamifikasi Unsur &amp; Prinsip Seni Rupa (Wayground)
          </h2>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Kerjakan kuis cepat berbasis tantangan di Wayground, lalu kembali ke BHOLANG RUPA untuk mengikuti Evaluasi Resmi 20 Pilihan Ganda &amp; 5 Esai di bawah ini.
          </p>
        </div>
        <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onOpenExternal({
                title: 'Kuis Wayground — Unsur & Prinsip Seni Rupa',
                subtitle: 'Evaluasi Interaktif Eksternal',
                url: WAYGROUND_URL,
                embedType: 'iframe',
              });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Buka Kuis Wayground</span>
          </button>
          <a
            href={WAYGROUND_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => playClickSound()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <span>Tab Baru</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* 2. Internal Quiz Evaluation (20 MC + 5 Essay) */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Evaluasi Resmi BHOLANG RUPA · Penilaian Otomatis &amp; Laporan PDF
            </p>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              Kuis Internal: 20 Pilihan Ganda &amp; 5 Esai
            </h3>
          </div>

          {!result && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActivePart('mc');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  activePart === 'mc'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Pilihan Ganda ({mcAnsweredCount}/20)
              </button>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setActivePart('essay');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                  activePart === 'essay'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}
              >
                Uraian Esai ({essayAnsweredCount}/5)
              </button>
            </div>
          )}
        </div>

        {/* Result Screen */}
        {result ? (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <div>
                <p className="text-xs text-zinc-500">Skor Pilihan Ganda (70%)</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                  {result.submission.mc_score}
                  <span className="text-xs font-normal text-zinc-500 ml-1.5">
                    ({result.submission.mc_correct}/{result.submission.mc_total} benar)
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Skor Esai Otomatis (30%)</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                  {result.submission.essay_score}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Nilai Akhir &amp; Predikat</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {result.submission.final_score}
                </p>
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  {result.submission.predicate}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playSuccessSound();
                    downloadQuizPdfReport(result.submission);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Unduh Laporan PDF</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    playClickSound();
                    if (!getGoogleAccessToken()) {
                      await onGoogleSignIn();
                    }
                    await syncSubmissionToWorkspace(result.submission);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-teal-600 text-teal-700 dark:text-teal-400 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/30 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Sinkronkan ke Sheets &amp; Drive</span>
                </button>
              </div>
            </div>

            {syncMessage && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
                <span>{syncMessage}</span>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold underline"
                  >
                    <span>Buka Google Spreadsheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Essay Feedback Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Umpan Balik Evaluasi Esai &amp; Pilihan Ganda
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.essayFeedback.map((ef, idx) => (
                  <div
                    key={ef.id}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Esai #{idx + 1}</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        Skor {ef.score}/{ef.maxScore}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Kata kunci terdeteksi:{' '}
                      {ef.matchedKeywords.length > 0 ? ef.matchedKeywords.join(', ') : 'Belum mencukupi'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      <strong>Kunci ringkas:</strong> {ef.sampleAnswer}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleResetQuiz}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kerjakan Ulang Kuis</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitQuiz} className="mt-6 space-y-6">
            {activePart === 'mc' ? (
              <div className="space-y-5">
                {mcQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                        Soal {idx + 1}/20
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{q.topic}</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {q.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map((opt, optIdx) => {
                        const selected = mcAnswers[String(q.id)] === optIdx;
                        const labelChar = ['A', 'B', 'C', 'D'][optIdx];
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => {
                              playClickSound();
                              setMcAnswers((prev) => ({ ...prev, [String(q.id)]: optIdx }));
                            }}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-left text-xs sm:text-sm transition-colors cursor-pointer ${
                              selected
                                ? 'border-amber-600 bg-amber-50 dark:bg-amber-950/40 text-zinc-900 dark:text-zinc-100 font-semibold'
                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                            }`}
                          >
                            <span
                              className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded ${
                                selected
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                              }`}
                            >
                              {labelChar}
                            </span>
                            <span>{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActivePart('essay');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold cursor-pointer"
                  >
                    Lanjut ke Bagian 2: 5 Soal Esai →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {essayQuestions.map((eq, idx) => (
                  <div
                    key={eq.id}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span>
                        <strong className="font-mono text-amber-600 dark:text-amber-400">
                          Esai {idx + 1}/5
                        </strong>{' '}
                        · {eq.topic}
                      </span>
                      <span className="font-mono">Maks. {eq.maxScore} poin</span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {eq.question}
                    </p>
                    <textarea
                      rows={3}
                      value={essayAnswers[String(eq.id)] || ''}
                      onChange={(e) =>
                        setEssayAnswers((prev) => ({ ...prev, [String(eq.id)]: e.target.value }))
                      }
                      placeholder="Tulis jawaban uraian secara lengkap dan jelas..."
                      className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setActivePart('mc');
                    }}
                    className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
                  >
                    ← Kembali ke Pilihan Ganda
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {submitting
                        ? 'Menilai & Menyimpan...'
                        : user
                        ? 'Kirim Jawaban & Lihat Nilai Otomatis'
                        : 'Masuk untuk Mengirim Kuis'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </div>

      {/* 3. Saved Quiz History & PDF Export */}
      {user && submissions.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Riwayat Nilai &amp; Laporan PDF ({submissions.length})
            </h3>
            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Lihat Rekap Google Spreadsheet</span>
              </a>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                <tr>
                  <th className="py-2.5 pr-4">Tanggal</th>
                  <th className="py-2.5 pr-4">Nama Siswa</th>
                  <th className="py-2.5 pr-4">PG</th>
                  <th className="py-2.5 pr-4">Esai</th>
                  <th className="py-2.5 pr-4">Nilai Akhir</th>
                  <th className="py-2.5 pr-4">Predikat</th>
                  <th className="py-2.5 pr-4">Status Sheets</th>
                  <th className="py-2.5 text-right">Laporan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="py-3 pr-4 font-mono text-zinc-500 whitespace-nowrap">
                      {new Date(sub.created_at).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                      {sub.student_name}
                    </td>
                    <td className="py-3 pr-4 font-mono tabular-nums">{sub.mc_score}</td>
                    <td className="py-3 pr-4 font-mono tabular-nums">{sub.essay_score}</td>
                    <td className="py-3 pr-4 font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                      {sub.final_score}
                    </td>
                    <td className="py-3 pr-4">{sub.predicate}</td>
                    <td className="py-3 pr-4">
                      {sub.sheets_synced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tersinkron</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500">Lokal</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          playClickSound();
                          downloadQuizPdfReport(sub);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
