import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { db, initDatabase } from './server/db.ts';
import {
  QUIZ_MC_QUESTIONS,
  QUIZ_ESSAY_QUESTIONS,
  evaluateEssayAnswer,
} from './shared/quizData.ts';

initDatabase();

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bholang-rupa-smk-seni-rupa-secret-2026';
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'guru' | 'siswa';
  kelas: string;
  nis_nip?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(event: string, payload: unknown): void {
  const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function createNotification(
  type: string,
  title: string,
  message: string,
  actorName: string,
  targetTab: string
): void {
  const info = db
    .prepare(
      `INSERT INTO notifications (type, title, message, actor_name, target_tab, is_read)
       VALUES (?, ?, ?, ?, ?, 0)`
    )
    .run(type, title, message, actorName, targetTab);
  const created = db.prepare('SELECT * FROM notifications WHERE id = ?').get(info.lastInsertRowid);
  broadcast('notification:new', created);
}

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer configuration for artworks and presentations
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

function parseToken(req: express.Request): AuthUser | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return undefined;
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    const dbUser = db
      .prepare('SELECT id, name, email, role, kelas, nis_nip FROM users WHERE id = ?')
      .get(decoded.id) as AuthUser | undefined;
    return dbUser;
  } catch {
    return undefined;
  }
}

function optionalAuth(req: express.Request, _res: express.Response, next: express.NextFunction): void {
  req.user = parseToken(req);
  next();
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const user = parseToken(req);
  if (!user) {
    res.status(401).json({ error: 'Silakan masuk ke akun BHOLANG RUPA terlebih dahulu.' });
    return;
  }
  req.user = user;
  next();
}

function requireTeacher(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const user = parseToken(req);
  if (!user) {
    res.status(401).json({ error: 'Silakan masuk sebagai Guru terlebih dahulu.' });
    return;
  }
  if (user.role !== 'guru') {
    res.status(403).json({ error: 'Fitur ini hanya dapat diakses oleh akun Guru.' });
    return;
  }
  req.user = user;
  next();
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role, kelas, nis_nip } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
    kelas?: string;
    nis_nip?: string;
  };

  if (!name?.trim() || !email?.trim() || !password || password.length < 4) {
    res.status(400).json({ error: 'Nama, email, dan kata sandi (minimal 4 karakter) wajib diisi.' });
    return;
  }

  const normalizedRole: 'guru' | 'siswa' = role === 'guru' ? 'guru' : 'siswa';
  const normalizedEmail = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk dengan akun Anda.' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (name, email, password_hash, role, kelas, nis_nip)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      normalizedEmail,
      hash,
      normalizedRole,
      (kelas || (normalizedRole === 'guru' ? 'Pengampu Seni Rupa' : 'X DKV 1')).trim(),
      (nis_nip || '').trim()
    );

  const user = db
    .prepare('SELECT id, name, email, role, kelas, nis_nip FROM users WHERE id = ?')
    .get(info.lastInsertRowid) as AuthUser;

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
    return;
  }

  const row = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as (AuthUser & { password_hash: string }) | undefined;

  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Email atau kata sandi tidak sesuai.' });
    return;
  }

  const user: AuthUser = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    kelas: row.kelas,
    nis_nip: row.nis_nip,
  };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// ==================== FILE UPLOAD ROUTES ====================
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Tidak ada berkas yang dikirim.' });
    return;
  }
  res.json({
    url: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
  });
});

app.post('/api/upload-canvas', requireAuth, (req, res) => {
  const { dataUrl, title } = req.body as { dataUrl?: string; title?: string };
  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    res.status(400).json({ error: 'Data gambar kanvas tidak valid.' });
    return;
  }
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) {
    res.status(400).json({ error: 'Format gambar kanvas tidak didukung.' });
    return;
  }
  const ext = matches[1] === 'jpeg' ? 'jpg' : 'png';
  const buffer = Buffer.from(matches[2], 'base64');
  const safeBase = (title || 'karya_kanvas').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  const filename = `${Date.now()}_${safeBase}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  res.json({ url: `/uploads/${filename}`, fileName: filename, size: buffer.length });
});

// ==================== ARTWORKS / GALLERY ROUTES ====================
function getEnrichedArtworks(currentUserId?: number) {
  const rows = db
    .prepare('SELECT * FROM artworks ORDER BY is_pinned DESC, created_at DESC, id DESC')
    .all() as Array<Record<string, unknown>>;

  return rows.map((art) => {
    const artId = Number(art.id);
    const likes = db
      .prepare('SELECT user_id FROM artwork_likes WHERE artwork_id = ?')
      .all(artId) as Array<{ user_id: number }>;
    const appreciations = db
      .prepare('SELECT * FROM artwork_appreciations WHERE artwork_id = ? ORDER BY id DESC')
      .all(artId);
    const comments = db
      .prepare('SELECT * FROM artwork_comments WHERE artwork_id = ? ORDER BY id ASC')
      .all(artId);

    return {
      ...art,
      id: artId,
      is_pinned: Boolean(art.is_pinned),
      likes_count: likes.length,
      liked_by_me: currentUserId ? likes.some((l) => l.user_id === currentUserId) : false,
      appreciations,
      comments,
    };
  });
}

app.get('/api/artworks', optionalAuth, (req, res) => {
  res.json({ artworks: getEnrichedArtworks(req.user?.id) });
});

app.post('/api/artworks', requireAuth, (req, res) => {
  const user = req.user!;
  const { title, description, category, image_url, drive_file_id, drive_web_link } = req.body as {
    title?: string;
    description?: string;
    category?: string;
    image_url?: string;
    drive_file_id?: string;
    drive_web_link?: string;
  };

  if (!title?.trim() || !image_url?.trim()) {
    res.status(400).json({ error: 'Judul karya dan gambar karya wajib diisi.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO artworks (user_id, author_name, author_kelas, title, description, category, image_url, drive_file_id, drive_web_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      user.name,
      user.kelas,
      title.trim(),
      (description || 'Karya eksplorasi unsur dan prinsip seni rupa.').trim(),
      (category || 'Eksplorasi Unsur & Prinsip').trim(),
      image_url.trim(),
      drive_file_id || '',
      drive_web_link || ''
    );

  const enriched = getEnrichedArtworks(user.id).find((a) => a.id === Number(info.lastInsertRowid));
  broadcast('artwork:created', enriched);
  createNotification(
    'artwork',
    'Karya Baru Diunggah',
    `${user.name} (${user.kelas}) mengunggah karya "${title.trim()}" ke Galeri Kelas.`,
    user.name,
    'gallery'
  );
  res.status(201).json({ artwork: enriched });
});

app.post('/api/artworks/:id/like', requireAuth, (req, res) => {
  const user = req.user!;
  const artworkId = Number(req.params.id);
  const exists = db.prepare('SELECT id, title FROM artworks WHERE id = ?').get(artworkId) as { id: number; title: string } | undefined;
  if (!exists) {
    res.status(404).json({ error: 'Karya tidak ditemukan.' });
    return;
  }

  const existingLike = db
    .prepare('SELECT id FROM artwork_likes WHERE artwork_id = ? AND user_id = ?')
    .get(artworkId, user.id);

  if (existingLike) {
    db.prepare('DELETE FROM artwork_likes WHERE artwork_id = ? AND user_id = ?').run(artworkId, user.id);
  } else {
    db.prepare('INSERT INTO artwork_likes (artwork_id, user_id) VALUES (?, ?)').run(artworkId, user.id);
  }

  const likes = db.prepare('SELECT user_id FROM artwork_likes WHERE artwork_id = ?').all(artworkId) as Array<{ user_id: number }>;
  broadcast('artwork:liked', { artworkId, likes_count: likes.length, userId: user.id, liked: !existingLike });
  res.json({ likes_count: likes.length, liked_by_me: !existingLike });
});

app.post('/api/artworks/:id/appreciate', requireAuth, (req, res) => {
  const user = req.user!;
  const artworkId = Number(req.params.id);
  const { badge } = req.body as { badge?: string };
  if (!badge?.trim()) {
    res.status(400).json({ error: 'Jenis apresiasi wajib dipilih.' });
    return;
  }
  const info = db
    .prepare('INSERT INTO artwork_appreciations (artwork_id, user_id, user_name, badge) VALUES (?, ?, ?, ?)')
    .run(artworkId, user.id, user.name, badge.trim());
  const item = db.prepare('SELECT * FROM artwork_appreciations WHERE id = ?').get(info.lastInsertRowid);
  broadcast('artwork:appreciated', { artworkId, appreciation: item });
  res.status(201).json({ appreciation: item });
});

app.post('/api/artworks/:id/comment', requireAuth, (req, res) => {
  const user = req.user!;
  const artworkId = Number(req.params.id);
  const { content } = req.body as { content?: string };
  if (!content?.trim()) {
    res.status(400).json({ error: 'Komentar tidak boleh kosong.' });
    return;
  }

  const art = db.prepare('SELECT id, title FROM artworks WHERE id = ?').get(artworkId) as { id: number; title: string } | undefined;
  if (!art) {
    res.status(404).json({ error: 'Karya tidak ditemukan.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO artwork_comments (artwork_id, user_id, author_name, author_role, content)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(artworkId, user.id, user.name, user.role, content.trim());

  const comment = db.prepare('SELECT * FROM artwork_comments WHERE id = ?').get(info.lastInsertRowid);
  broadcast('artwork:commented', { artworkId, comment });
  createNotification(
    'comment',
    'Komentar Karya Baru',
    `${user.name} mengomentari karya "${art.title}".`,
    user.name,
    'gallery'
  );
  res.status(201).json({ comment });
});

app.patch('/api/artworks/:id/pin', requireTeacher, (req, res) => {
  const artworkId = Number(req.params.id);
  const row = db.prepare('SELECT id, is_pinned, title FROM artworks WHERE id = ?').get(artworkId) as
    | { id: number; is_pinned: number; title: string }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Karya tidak ditemukan.' });
    return;
  }
  const nextPin = row.is_pinned ? 0 : 1;
  db.prepare('UPDATE artworks SET is_pinned = ? WHERE id = ?').run(nextPin, artworkId);
  broadcast('artwork:pinned', { artworkId, is_pinned: Boolean(nextPin) });
  res.json({ id: artworkId, is_pinned: Boolean(nextPin) });
});

app.patch('/api/artworks/:id/drive', requireAuth, (req, res) => {
  const artworkId = Number(req.params.id);
  const { drive_file_id, drive_web_link } = req.body as { drive_file_id?: string; drive_web_link?: string };
  db.prepare('UPDATE artworks SET drive_file_id = ?, drive_web_link = ? WHERE id = ?').run(
    drive_file_id || '',
    drive_web_link || '',
    artworkId
  );
  broadcast('artwork:drive_synced', { artworkId, drive_file_id, drive_web_link });
  res.json({ success: true });
});

// ==================== FORUM ROUTES ====================
function getEnrichedForumPosts() {
  const posts = db.prepare('SELECT * FROM forum_posts ORDER BY id DESC').all() as Array<Record<string, unknown>>;
  return posts.map((post) => {
    const replies = db
      .prepare('SELECT * FROM forum_replies WHERE post_id = ? ORDER BY id ASC')
      .all(Number(post.id));
    return { ...post, replies };
  });
}

app.get('/api/forum', (_req, res) => {
  res.json({ posts: getEnrichedForumPosts() });
});

app.post('/api/forum', requireAuth, (req, res) => {
  const user = req.user!;
  const { topic, title, content } = req.body as { topic?: string; title?: string; content?: string };
  if (!title?.trim() || !content?.trim()) {
    res.status(400).json({ error: 'Judul dan isi diskusi wajib diisi.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO forum_posts (user_id, author_name, author_role, author_kelas, topic, title, content)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, user.name, user.role, user.kelas, (topic || 'Diskusi Umum').trim(), title.trim(), content.trim());

  const post = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(info.lastInsertRowid) as Record<string, unknown>;
  const enriched = { ...post, replies: [] };
  broadcast('forum:new_post', enriched);
  createNotification(
    'forum',
    'Topik Diskusi Baru',
    `${user.name} membuat topik "${title.trim()}".`,
    user.name,
    'forum'
  );
  res.status(201).json({ post: enriched });
});

app.post('/api/forum/:id/reply', requireAuth, (req, res) => {
  const user = req.user!;
  const postId = Number(req.params.id);
  const { content } = req.body as { content?: string };
  if (!content?.trim()) {
    res.status(400).json({ error: 'Isi balasan wajib diisi.' });
    return;
  }

  const parent = db.prepare('SELECT id, title FROM forum_posts WHERE id = ?').get(postId) as
    | { id: number; title: string }
    | undefined;
  if (!parent) {
    res.status(404).json({ error: 'Topik diskusi tidak ditemukan.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO forum_replies (post_id, user_id, author_name, author_role, author_kelas, content)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(postId, user.id, user.name, user.role, user.kelas, content.trim());

  const reply = db.prepare('SELECT * FROM forum_replies WHERE id = ?').get(info.lastInsertRowid);
  broadcast('forum:new_reply', { postId, reply });
  createNotification(
    'forum',
    'Balasan Diskusi Baru',
    `${user.name} membalas topik "${parent.title}".`,
    user.name,
    'forum'
  );
  res.status(201).json({ reply });
});

app.delete('/api/forum/:id', requireAuth, (req, res) => {
  const user = req.user!;
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT user_id FROM forum_posts WHERE id = ?').get(postId) as { user_id: number } | undefined;
  if (!post) {
    res.status(404).json({ error: 'Topik tidak ditemukan.' });
    return;
  }
  if (user.role !== 'guru' && post.user_id !== user.id) {
    res.status(403).json({ error: 'Anda tidak berwenang menghapus topik ini.' });
    return;
  }
  db.prepare('DELETE FROM forum_posts WHERE id = ?').run(postId);
  broadcast('forum:deleted', { postId });
  res.json({ success: true });
});

// ==================== PRESENTATIONS ROUTES ====================
app.get('/api/presentations', (_req, res) => {
  const presentations = db.prepare('SELECT * FROM presentations ORDER BY id DESC').all();
  res.json({ presentations });
});

app.post('/api/presentations', requireAuth, (req, res) => {
  const user = req.user!;
  const { title, topic, description, file_url, file_name, file_type, file_size, drive_file_id, drive_web_link } =
    req.body as {
      title?: string;
      topic?: string;
      description?: string;
      file_url?: string;
      file_name?: string;
      file_type?: string;
      file_size?: number;
      drive_file_id?: string;
      drive_web_link?: string;
    };

  if (!title?.trim() || !file_url?.trim() || !file_name?.trim()) {
    res.status(400).json({ error: 'Judul dan berkas presentasi wajib diisi.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO presentations (user_id, author_name, author_kelas, title, topic, description, file_url, file_name, file_type, file_size, drive_file_id, drive_web_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      user.name,
      user.kelas,
      title.trim(),
      (topic || 'Unsur & Prinsip Seni Rupa').trim(),
      (description || '').trim(),
      file_url.trim(),
      file_name.trim(),
      file_type || 'application/octet-stream',
      file_size || 0,
      drive_file_id || '',
      drive_web_link || ''
    );

  const created = db.prepare('SELECT * FROM presentations WHERE id = ?').get(info.lastInsertRowid);
  broadcast('presentation:created', created);
  createNotification(
    'presentation',
    'Presentasi Siswa Baru',
    `${user.name} (${user.kelas}) mengunggah presentasi "${title.trim()}".`,
    user.name,
    'presentations'
  );
  res.status(201).json({ presentation: created });
});

app.patch('/api/presentations/:id/drive', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { drive_file_id, drive_web_link } = req.body as { drive_file_id?: string; drive_web_link?: string };
  db.prepare('UPDATE presentations SET drive_file_id = ?, drive_web_link = ? WHERE id = ?').run(
    drive_file_id || '',
    drive_web_link || '',
    id
  );
  res.json({ success: true });
});

// ==================== QUIZ & EVALUATION ROUTES ====================
app.get('/api/quiz/questions', (_req, res) => {
  const mcPublic = QUIZ_MC_QUESTIONS.map(({ id, topic, question, options }) => ({
    id,
    topic,
    question,
    options,
  }));
  const essayPublic = QUIZ_ESSAY_QUESTIONS.map(({ id, topic, question, maxScore }) => ({
    id,
    topic,
    question,
    maxScore,
  }));
  res.json({ multipleChoice: mcPublic, essays: essayPublic });
});

app.post('/api/quiz/submit', requireAuth, (req, res) => {
  const user = req.user!;
  const { mcAnswers, essayAnswers } = req.body as {
    mcAnswers?: Record<string, number>;
    essayAnswers?: Record<string, string>;
  };

  const mcMap = mcAnswers || {};
  const essayMap = essayAnswers || {};

  let mcCorrect = 0;
  const mcFeedback = QUIZ_MC_QUESTIONS.map((q) => {
    const selected = mcMap[String(q.id)];
    const isCorrect = selected === q.correctIndex;
    if (isCorrect) mcCorrect += 1;
    return {
      id: q.id,
      selected,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const mcScore = Number(((mcCorrect / QUIZ_MC_QUESTIONS.length) * 100).toFixed(1));

  const essayScores: number[] = [];
  const essayFeedback = QUIZ_ESSAY_QUESTIONS.map((q) => {
    const ans = essayMap[String(q.id)] || '';
    const evalResult = evaluateEssayAnswer(ans, q);
    essayScores.push(evalResult.score);
    return {
      id: q.id,
      score: evalResult.score,
      maxScore: q.maxScore,
      matchedKeywords: evalResult.matchedKeywords,
      sampleAnswer: q.sampleAnswer,
    };
  });

  const totalEssayRaw = essayScores.reduce((acc, s) => acc + s, 0);
  const essayScore = Number(totalEssayRaw.toFixed(1)); // Out of 100 (5 x 20)
  // Final weighted score: 70% Pilihan Ganda + 30% Esai
  const finalScore = Number((mcScore * 0.7 + essayScore * 0.3).toFixed(1));

  let predicate = 'Perlu Bimbingan (D)';
  if (finalScore >= 90) predicate = 'Sangat Kompeten (A)';
  else if (finalScore >= 80) predicate = 'Kompeten (B)';
  else if (finalScore >= 70) predicate = 'Cukup Kompeten (C)';

  const info = db
    .prepare(
      `INSERT INTO quiz_submissions (
        user_id, student_name, student_email, student_kelas,
        mc_answers_json, essay_answers_json, essay_scores_json,
        mc_correct, mc_total, mc_score, essay_score, final_score, predicate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      user.name,
      user.email,
      user.kelas,
      JSON.stringify(mcMap),
      JSON.stringify(essayMap),
      JSON.stringify(essayScores),
      mcCorrect,
      QUIZ_MC_QUESTIONS.length,
      mcScore,
      essayScore,
      finalScore,
      predicate
    );

  const submission = db.prepare('SELECT * FROM quiz_submissions WHERE id = ?').get(info.lastInsertRowid);
  broadcast('quiz:submitted', submission);
  createNotification(
    'quiz',
    'Hasil Kuis Evaluasi Baru',
    `${user.name} (${user.kelas}) menyelesaikan kuis internal dengan nilai akhir ${finalScore}.`,
    user.name,
    'dashboard'
  );

  res.status(201).json({
    submission,
    mcFeedback,
    essayFeedback,
  });
});

app.get('/api/quiz/submissions', requireAuth, (req, res) => {
  const user = req.user!;
  if (user.role === 'guru') {
    const submissions = db.prepare('SELECT * FROM quiz_submissions ORDER BY id DESC').all();
    res.json({ submissions });
    return;
  }
  const submissions = db
    .prepare('SELECT * FROM quiz_submissions WHERE user_id = ? ORDER BY id DESC')
    .all(user.id);
  res.json({ submissions });
});

app.patch('/api/quiz/submissions/:id/essay-score', requireTeacher, (req, res) => {
  const id = Number(req.params.id);
  const { essayScores, teacherNote } = req.body as { essayScores?: number[]; teacherNote?: string };
  const row = db.prepare('SELECT * FROM quiz_submissions WHERE id = ?').get(id) as
    | { mc_score: number }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Data nilai kuis tidak ditemukan.' });
    return;
  }

  const sanitized = (essayScores || [0, 0, 0, 0, 0]).slice(0, 5).map((n) => Math.max(0, Math.min(20, Number(n) || 0)));
  const essayScore = Number(sanitized.reduce((a, b) => a + b, 0).toFixed(1));
  const finalScore = Number((row.mc_score * 0.7 + essayScore * 0.3).toFixed(1));

  let predicate = 'Perlu Bimbingan (D)';
  if (finalScore >= 90) predicate = 'Sangat Kompeten (A)';
  else if (finalScore >= 80) predicate = 'Kompeten (B)';
  else if (finalScore >= 70) predicate = 'Cukup Kompeten (C)';

  db.prepare(
    `UPDATE quiz_submissions
     SET essay_scores_json = ?, essay_score = ?, final_score = ?, predicate = ?, teacher_note = ?
     WHERE id = ?`
  ).run(JSON.stringify(sanitized), essayScore, finalScore, predicate, (teacherNote || '').trim(), id);

  const updated = db.prepare('SELECT * FROM quiz_submissions WHERE id = ?').get(id);
  broadcast('quiz:updated', updated);
  res.json({ submission: updated });
});

app.patch('/api/quiz/submissions/:id/sync', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const { sheets_synced, drive_file_id, drive_web_link } = req.body as {
    sheets_synced?: boolean;
    drive_file_id?: string;
    drive_web_link?: string;
  };
  db.prepare(
    `UPDATE quiz_submissions
     SET sheets_synced = COALESCE(?, sheets_synced),
         drive_file_id = COALESCE(NULLIF(?, ''), drive_file_id),
         drive_web_link = COALESCE(NULLIF(?, ''), drive_web_link)
     WHERE id = ?`
  ).run(sheets_synced ? 1 : 0, drive_file_id || '', drive_web_link || '', id);
  res.json({ success: true });
});

// ==================== NOTIFICATIONS & TEACHER DASHBOARD ====================
app.get('/api/notifications', requireAuth, (_req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications ORDER BY id DESC LIMIT 30').all();
  res.json({ notifications });
});

app.post('/api/notifications/read-all', requireAuth, (_req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1').run();
  res.json({ success: true });
});

app.get('/api/dashboard/summary', requireTeacher, (_req, res) => {
  const students = db
    .prepare(`SELECT id, name, email, kelas, nis_nip, created_at FROM users WHERE role = 'siswa' ORDER BY name ASC`)
    .all() as Array<{ id: number; name: string; email: string; kelas: string; nis_nip: string; created_at: string }>;

  const artworks = db.prepare('SELECT * FROM artworks ORDER BY id DESC').all();
  const presentations = db.prepare('SELECT * FROM presentations ORDER BY id DESC').all();
  const submissions = db.prepare('SELECT * FROM quiz_submissions ORDER BY id DESC').all() as Array<{
    user_id: number;
    student_name: string;
    mc_score: number;
    essay_score: number;
    final_score: number;
    predicate: string;
    created_at: string;
  }>;

  const studentProgress = students.map((s) => {
    const studentArtworks = (artworks as Array<{ user_id: number }>).filter((a) => a.user_id === s.id);
    const studentPresentations = (presentations as Array<{ user_id: number }>).filter((p) => p.user_id === s.id);
    const studentQuizzes = submissions.filter((q) => q.user_id === s.id);
    const latestQuiz = studentQuizzes[0] || null;
    return {
      ...s,
      artwork_count: studentArtworks.length,
      presentation_count: studentPresentations.length,
      quiz_count: studentQuizzes.length,
      latest_mc_score: latestQuiz ? latestQuiz.mc_score : 0,
      latest_essay_score: latestQuiz ? latestQuiz.essay_score : 0,
      latest_final_score: latestQuiz ? latestQuiz.final_score : 0,
      predicate: latestQuiz ? latestQuiz.predicate : 'Belum Mengerjakan',
    };
  });

  res.json({
    students: studentProgress,
    artworks,
    presentations,
    submissions,
  });
});

// ==================== GOOGLE WORKSPACE SETTINGS ====================
app.get('/api/settings/google', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM app_settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  rows.forEach((r) => {
    settings[r.key] = r.value;
  });
  res.json({ settings });
});

app.post('/api/settings/google', requireAuth, (req, res) => {
  const { google_drive_folder_id, google_spreadsheet_id, google_spreadsheet_url } = req.body as Record<string, string>;
  const upsert = db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  if (google_drive_folder_id) upsert.run('google_drive_folder_id', google_drive_folder_id.trim());
  if (google_spreadsheet_id) upsert.run('google_spreadsheet_id', google_spreadsheet_id.trim());
  if (google_spreadsheet_url) upsert.run('google_spreadsheet_url', google_spreadsheet_url.trim());
  res.json({ success: true });
});

// ==================== START SERVER + VITE ====================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BHOLANG RUPA server running at http://localhost:${PORT}`);
  });
}

startServer();
