import { jsPDF } from 'jspdf';
import type { QuizSubmission } from '../types';
import { QUIZ_ESSAY_QUESTIONS } from '../../shared/quizData';

export function generateQuizPdfDocument(submission: QuizSubmission): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const essayScores: number[] = (() => {
    try {
      return JSON.parse(submission.essay_scores_json || '[0,0,0,0,0]');
    } catch {
      return [0, 0, 0, 0, 0];
    }
  })();

  // Header band
  doc.setFillColor(24, 24, 27);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(245, 158, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('BHOLANG RUPA', 16, 15);
  doc.setTextColor(244, 244, 245);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Laporan Hasil Evaluasi Pembelajaran · Unsur & Prinsip Seni Rupa Kelas X SMK', 16, 23);

  // Student Metadata
  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Identitas Peserta Didik', 16, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nama Lengkap   : ${submission.student_name}`, 16, 54);
  doc.text(`Kelas / Jurusan : ${submission.student_kelas}`, 16, 60);
  doc.text(`Email Akun        : ${submission.student_email}`, 16, 66);
  doc.text(`Tanggal Evaluasi : ${new Date(submission.created_at).toLocaleString('id-ID')}`, 16, 72);

  // Score Summary Box
  doc.setFillColor(249, 248, 246);
  doc.setDrawColor(212, 212, 216);
  doc.roundedRect(16, 80, 178, 32, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Pilihan Ganda (70%)', 24, 90);
  doc.text('Uraian Esai (30%)', 84, 90);
  doc.text('Nilai Akhir & Predikat', 136, 90);

  doc.setFontSize(15);
  doc.setTextColor(194, 65, 12);
  doc.text(`${submission.mc_score} (${submission.mc_correct}/${submission.mc_total})`, 24, 101);
  doc.text(`${submission.essay_score} / 100`, 84, 101);
  doc.setTextColor(15, 118, 110);
  doc.text(`${submission.final_score}`, 136, 101);
  doc.setFontSize(9);
  doc.setTextColor(63, 63, 70);
  doc.text(submission.predicate, 136, 107);

  // Essay Breakdown
  let y = 126;
  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Rincian Skor Soal Esai (5 Butir)', 16, y);
  y += 8;

  QUIZ_ESSAY_QUESTIONS.forEach((q, index) => {
    const score = essayScores[index] ?? 0;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(24, 24, 27);
    doc.text(`Soal ${index + 1} (${q.topic}) — Skor: ${score} / ${q.maxScore}`, 16, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(82, 82, 91);
    const wrapped = doc.splitTextToSize(q.question, 174);
    doc.text(wrapped, 16, y);
    y += wrapped.length * 4.2 + 5;
  });

  if (submission.teacher_note) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(24, 24, 27);
    doc.text('Catatan Guru Pengampu:', 16, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const noteLines = doc.splitTextToSize(submission.teacher_note, 174);
    doc.text(noteLines, 16, y);
  }

  // Footer
  doc.setFontSize(8.5);
  doc.setTextColor(113, 113, 122);
  doc.text('Dokumen diterbitkan otomatis oleh Sistem Evaluasi BHOLANG RUPA · Kurikulum Merdeka Seni Rupa SMK', 16, 282);

  return doc;
}

export function downloadQuizPdfReport(submission: QuizSubmission): void {
  const doc = generateQuizPdfDocument(submission);
  const safeName = submission.student_name.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Laporan_Nilai_BHOLANG_RUPA_${safeName}.pdf`);
}

export function buildQuizPdfBlob(submission: QuizSubmission): Blob {
  const doc = generateQuizPdfDocument(submission);
  return doc.output('blob');
}
