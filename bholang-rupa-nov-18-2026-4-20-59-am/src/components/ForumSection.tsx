import React, { useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import type { ForumPost, User } from '../types';
import { playClickSound, playSuccessSound } from '../utils/sound';

interface ForumSectionProps {
  user: User | null;
  token: string | null;
  posts: ForumPost[];
  onRequireAuth: () => void;
}

const TOPICS = ['Semua Topik', 'Unsur Seni Rupa', 'Prinsip Desain', 'Tanya Tugas', 'Apresiasi Karya'];

export const ForumSection: React.FC<ForumSectionProps> = ({
  user,
  token,
  posts,
  onRequireAuth,
}) => {
  const [selectedTopic, setSelectedTopic] = useState('Semua Topik');
  const [topic, setTopic] = useState('Unsur Seni Rupa');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyMap, setReplyMap] = useState<Record<number, string>>({});

  const filtered =
    selectedTopic === 'Semua Topik'
      ? posts
      : posts.filter((p) => p.topic === selectedTopic);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/forum', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic, title: title.trim(), content: content.trim() }),
      });
      if (res.ok) {
        playSuccessSound();
        setTitle('');
        setContent('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    playClickSound();
    if (!user || !token) {
      onRequireAuth();
      return;
    }
    const text = (replyMap[postId] || '').trim();
    if (!text) return;
    const res = await fetch(`/api/forum/${postId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: text }),
    });
    if (res.ok) {
      playSuccessSound();
      setReplyMap((prev) => ({ ...prev, [postId]: '' }));
    }
  };

  const handleDelete = async (postId: number) => {
    playClickSound();
    if (!token) return;
    await fetch(`/api/forum/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Create Discussion Form */}
      <div className="lg:col-span-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Mulai Topik Diskusi Kelas
          </h2>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Ajukan pertanyaan materi, minta masukan komposisi karya, atau tanggapi diskusi guru secara real-time.
        </p>

        <form onSubmit={handleCreatePost} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Kategori Materi
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100"
            >
              {TOPICS.filter((t) => t !== 'Semua Topik').map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Judul Pertanyaan / Diskusi
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Cara menentukan keseimbangan asimetris..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Uraian Diskusi
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis pendapat atau pertanyaan Anda untuk guru dan teman sekelas..."
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{user ? 'Kirim Topik Diskusi' : 'Masuk untuk Berdiskusi'}</span>
          </button>
        </form>
      </div>

      {/* Right: Real-Time Thread Feed */}
      <div className="lg:col-span-8 space-y-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                playClickSound();
                setSelectedTopic(t);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                selectedTopic === t
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {filtered.map((post) => (
          <article
            key={post.id}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#181A1E] p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {post.author_name}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className={post.author_role === 'guru' ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                    {post.author_role === 'guru' ? 'Guru' : `Siswa ${post.author_kelas}`}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{post.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(post.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <h3 className="mt-1.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {post.title}
                </h3>
              </div>

              {(user?.role === 'guru' || user?.id === post.user_id) && (
                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  title="Hapus Topik"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {post.content}
            </p>

            {/* Replies */}
            {post.replies.length > 0 && (
              <div className="space-y-2.5 pl-4 border-l border-zinc-200 dark:border-zinc-800">
                {post.replies.map((rep) => (
                  <div
                    key={rep.id}
                    className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 px-3.5 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {rep.author_name}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={rep.author_role === 'guru' ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                        {rep.author_role === 'guru' ? 'Guru' : `Siswa ${rep.author_kelas}`}
                      </span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {rep.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            <form onSubmit={(e) => handleReply(e, post.id)} className="flex gap-2 pt-2">
              <input
                type="text"
                value={replyMap[post.id] || ''}
                onChange={(e) =>
                  setReplyMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                }
                placeholder="Tulis balasan diskusi..."
                className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs sm:text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 cursor-pointer whitespace-nowrap"
              >
                Balas
              </button>
            </form>
          </article>
        ))}
      </div>
    </section>
  );
};
