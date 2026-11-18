import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(process.cwd(), 'bholang_rupa.db');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('guru', 'siswa')),
      kelas TEXT NOT NULL DEFAULT 'X DKV 1',
      nis_nip TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS artworks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_kelas TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Eksplorasi Unsur & Prinsip',
      image_url TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      drive_file_id TEXT DEFAULT '',
      drive_web_link TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS artwork_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      UNIQUE(artwork_id, user_id),
      FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS artwork_appreciations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      badge TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS artwork_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artwork_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (artwork_id) REFERENCES artworks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      author_kelas TEXT NOT NULL,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS forum_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      author_kelas TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS presentations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      author_kelas TEXT NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      description TEXT DEFAULT '',
      file_url TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      drive_file_id TEXT DEFAULT '',
      drive_web_link TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS quiz_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      student_name TEXT NOT NULL,
      student_email TEXT NOT NULL,
      student_kelas TEXT NOT NULL,
      mc_answers_json TEXT NOT NULL,
      essay_answers_json TEXT NOT NULL,
      essay_scores_json TEXT NOT NULL,
      mc_correct INTEGER NOT NULL,
      mc_total INTEGER NOT NULL DEFAULT 20,
      mc_score REAL NOT NULL,
      essay_score REAL NOT NULL,
      final_score REAL NOT NULL,
      predicate TEXT NOT NULL,
      teacher_note TEXT DEFAULT '',
      sheets_synced INTEGER NOT NULL DEFAULT 0,
      drive_file_id TEXT DEFAULT '',
      drive_web_link TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      target_tab TEXT NOT NULL DEFAULT 'dashboard',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  seedInitialData();
}

function seedInitialData(): void {
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount > 0) return;

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, kelas, nis_nip)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const guruHash = bcrypt.hashSync('guru123', 10);
  const siswaHash = bcrypt.hashSync('siswa123', 10);

  const guruId = Number(insertUser.run('Ratna Sari, S.Sn., M.Pd.', 'guru@bholangrupa.sch.id', guruHash, 'guru', 'Pengampu Seni Rupa', '198704122011012008').lastInsertRowid);
  const bimaId = Number(insertUser.run('Bima Pratama', 'siswa@bholangrupa.sch.id', siswaHash, 'siswa', 'X DKV 1', '20261001').lastInsertRowid);
  const alyaId = Number(insertUser.run('Alya Putri Maharani', 'alya@bholangrupa.sch.id', siswaHash, 'siswa', 'X DKV 1', '20261002').lastInsertRowid);
  const dimasId = Number(insertUser.run('Dimas Wijaya', 'dimas@bholangrupa.sch.id', siswaHash, 'siswa', 'X Seni Rupa', '20261003').lastInsertRowid);

  // Seed Google Drive target folder setting from prompt
  db.prepare(`INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)`).run(
    'google_drive_folder_id',
    '1TkzEz7v37vqse7NDGpANNhaGbV5pUdJ0'
  );

  // Seed Artworks with our generated local images
  const insertArt = db.prepare(`
    INSERT INTO artworks (user_id, author_name, author_kelas, title, description, category, image_url, is_pinned)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const art1 = Number(insertArt.run(
    alyaId,
    'Alya Putri Maharani',
    'X DKV 1',
    'Harmoni Irama Lingkaran & Warna Primer',
    'Eksplorasi prinsip irama progresif dan keseimbangan asimetris menggunakan kombinasi warna primer dan sekunder pada media cat air di atas kertas bertekstur.',
    'Prinsip Irama & Warna',
    '/src/assets/images/artwork_sample_komposisi_1794949802932.jpg',
    1
  ).lastInsertRowid);

  const art2 = Number(insertArt.run(
    bimaId,
    'Bima Pratama',
    'X DKV 1',
    'Studi Kontras Garis, Bidang & Arsir',
    'Komposisi dinamis memadukan garis lengkung organis dengan bidang geometris serta teknik arsir silang (cross-hatching) untuk membentuk kesan ruang dan gelap terang.',
    'Unsur Garis & Gelap Terang',
    '/src/assets/images/artwork_sample_garis_bentuk_1794949803826.jpg',
    0
  ).lastInsertRowid);

  const art3 = Number(insertArt.run(
    dimasId,
    'Dimas Wijaya',
    'X Seni Rupa',
    'Pusaran Bintik Komplementer (Pointilisme)',
    'Penerapan penekanan radial (emphasis) di pusat kanvas dengan kontras warna panas oranye-kuning terhadap latar biru-ungu dingin menggunakan teknik kuas bintik.',
    'Tekstur & Penekanan Radial',
    '/src/assets/images/artwork_sample_eksplorasi_warna_1794949804520.jpg',
    1
  ).lastInsertRowid);

  // Likes & appreciations
  db.prepare('INSERT INTO artwork_likes (artwork_id, user_id) VALUES (?, ?)').run(art1, guruId);
  db.prepare('INSERT INTO artwork_likes (artwork_id, user_id) VALUES (?, ?)').run(art1, bimaId);
  db.prepare('INSERT INTO artwork_likes (artwork_id, user_id) VALUES (?, ?)').run(art3, guruId);
  db.prepare('INSERT INTO artwork_appreciations (artwork_id, user_id, user_name, badge) VALUES (?, ?, ?, ?)').run(
    art1, guruId, 'Ratna Sari, S.Sn., M.Pd.', 'Komposisi Seimbang & Dinamis'
  );
  db.prepare('INSERT INTO artwork_appreciations (artwork_id, user_id, user_name, badge) VALUES (?, ?, ?, ?)').run(
    art3, bimaId, 'Bima Pratama', 'Kontras Warna Kuat'
  );

  db.prepare(`
    INSERT INTO artwork_comments (artwork_id, user_id, author_name, author_role, content)
    VALUES (?, ?, ?, ?, ?)
  `).run(art1, guruId, 'Ratna Sari, S.Sn., M.Pd.', 'guru', 'Pengolahan irama lengkung dan transisi warna primer ke sekundernya sangat terasa mengalir, Alya. Pertahankan konsistensi sapuan kuasnya.');

  // Seed Forum Posts
  const insertPost = db.prepare(`
    INSERT INTO forum_posts (user_id, author_name, author_role, author_kelas, topic, title, content)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const post1 = Number(insertPost.run(
    guruId,
    'Ratna Sari, S.Sn., M.Pd.',
    'guru',
    'Pengampu Seni Rupa',
    'Prinsip Desain',
    'Diskusi Pekan Ini: Menemukan Titik Fokus (Emphasis) pada Poster DKV',
    'Anak-anak kelas X, coba amati poster atau karya teman kalian di Galeri Kelas. Menurut kalian, unsur apa yang paling efektif dipakai untuk menciptakan penekanan (center of interest) tanpa membuat desain terasa ramai?'
  ).lastInsertRowid);

  const post2 = Number(insertPost.run(
    bimaId,
    'Bima Pratama',
    'siswa',
    'X DKV 1',
    'Unsur Seni Rupa',
    'Perbedaan Pencampuran Warna Pigmen (RYB) vs Warna Digital (RGB)',
    'Bu Ratna dan teman-teman, waktu saya coba Spektrum Warna di Lab Seni, kenapa campuran merah + hijau di cat menghasilkan warna kecokelatan sedangkan di layar RGB jadi kuning?'
  ).lastInsertRowid);

  const insertReply = db.prepare(`
    INSERT INTO forum_replies (post_id, user_id, author_name, author_role, author_kelas, content)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertReply.run(
    post1, alyaId, 'Alya Putri Maharani', 'siswa', 'X DKV 1',
    'Menurut saya kombinasi kontras warna komplementer dan ruang negatif yang cukup lega sangat membantu mata langsung tertuju ke objek utama, Bu.'
  );
  insertReply.run(
    post2, guruId, 'Ratna Sari, S.Sn., M.Pd.', 'guru', 'Pengampu Seni Rupa',
    'Pertanyaan bagus, Bima! Cat bekerja dengan sistem subtraktif (menyerap cahaya), jadi pigmen merah dan hijau saling meredam dan menjadi cokelat/netral. Sedangkan layar monitor memancarkan cahaya (aditif RGB), sehingga merah + hijau cahaya menghasilkan kuning terang.'
  );

  // Seed Quiz Submissions for initial Teacher Dashboard analytics
  const insertQuiz = db.prepare(`
    INSERT INTO quiz_submissions (
      user_id, student_name, student_email, student_kelas,
      mc_answers_json, essay_answers_json, essay_scores_json,
      mc_correct, mc_total, mc_score, essay_score, final_score, predicate, teacher_note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertQuiz.run(
    alyaId, 'Alya Putri Maharani', 'alya@bholangrupa.sch.id', 'X DKV 1',
    '{}', '{}', '[18,19,17,18,19]',
    18, 20, 90, 91, 90.4, 'Sangat Kompeten (A)', 'Pemahaman unsur warna dan prinsip irama sangat matang.'
  );
  insertQuiz.run(
    bimaId, 'Bima Pratama', 'siswa@bholangrupa.sch.id', 'X DKV 1',
    '{}', '{}', '[16,17,16,15,18]',
    16, 20, 80, 82, 80.7, 'Kompeten (B)', 'Baik pada analisis garis dan gelap terang, tingkatkan ketelitian soal proporsi.'
  );
  insertQuiz.run(
    dimasId, 'Dimas Wijaya', 'dimas@bholangrupa.sch.id', 'X Seni Rupa',
    '{}', '{}', '[15,14,16,15,15]',
    14, 20, 70, 75, 71.8, 'Cukup Kompeten (C)', 'Perlu penguatan pada materi warna komplementer dan keseimbangan radial.'
  );

  // Seed Presentation sample (local printable/viewable HTML/SVG summary or sample PDF)
  const sampleSlidesHtml = `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Presentasi Unsur Warna & Harmoni - Alya Putri</title>
<style>body{font-family:system-ui,sans-serif;max-width:860px;margin:40px auto;padding:24px;color:#18181b;line-height:1.6}h1{color:#c2410c}.card{border:1px solid #e4e4e7;border-radius:12px;padding:20px;margin:16px 0;background:#fafaf9}</style>
</head><body>
<h1>Eksplorasi Warna Primer, Sekunder & Harmoni Komposisi</h1>
<p><strong>Penyusun:</strong> Alya Putri Maharani (X DKV 1) · <strong>Mata Pelajaran:</strong> Seni Rupa Kelas X SMK</p>
<div class="card"><h2>1. Roda Warna Pigmen (RYB)</h2><p>Warna primer terdiri atas Merah, Kuning, dan Biru. Pencampuran dua warna primer menghasilkan warna sekunder yaitu Oranye, Hijau, dan Ungu.</p></div>
<div class="card"><h2>2. Prinsip Keselarasan & Kontras</h2><p>Harmoni analogus menenangkan mata untuk latar belakang, sementara kontras komplementer dipakai untuk menonjolkan titik fokus (emphasis).</p></div>
</body></html>`;
  const samplePresPath = path.join(UPLOADS_DIR, 'presentasi_alya_warna_harmoni.html');
  if (!fs.existsSync(samplePresPath)) {
    fs.writeFileSync(samplePresPath, sampleSlidesHtml, 'utf8');
  }

  db.prepare(`
    INSERT INTO presentations (user_id, author_name, author_kelas, title, topic, description, file_url, file_name, file_type, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    alyaId, 'Alya Putri Maharani', 'X DKV 1',
    'Eksplorasi Warna Primer, Sekunder & Harmoni Komposisi',
    'Unsur Warna & Prinsip Harmoni',
    'Ringkasan materi kelompok 1 mengenai penerapan skema warna analogus dan komplementer pada ilustrasi kemasan produk SMK.',
    '/uploads/presentasi_alya_warna_harmoni.html',
    'presentasi_alya_warna_harmoni.html',
    'text/html',
    Buffer.byteLength(sampleSlidesHtml, 'utf8')
  );

  db.prepare(`
    INSERT INTO notifications (type, title, message, actor_name, target_tab, is_read)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'artwork',
    'Karya Baru di Galeri Kelas',
    'Alya Putri Maharani mengunggah karya "Harmoni Irama Lingkaran & Warna Primer".',
    'Alya Putri Maharani',
    'gallery',
    0
  );
}
