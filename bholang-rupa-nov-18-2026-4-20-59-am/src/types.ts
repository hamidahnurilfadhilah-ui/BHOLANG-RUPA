export type UserRole = 'guru' | 'siswa';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  kelas: string;
  nis_nip?: string;
}

export interface ArtworkComment {
  id: number;
  artwork_id: number;
  user_id: number;
  author_name: string;
  author_role: UserRole;
  content: string;
  created_at: string;
}

export interface ArtworkAppreciation {
  id: number;
  artwork_id: number;
  user_id: number;
  user_name: string;
  badge: string;
  created_at: string;
}

export interface Artwork {
  id: number;
  user_id: number;
  author_name: string;
  author_kelas: string;
  title: string;
  description: string;
  category: string;
  image_url: string;
  is_pinned: boolean;
  likes_count: number;
  liked_by_me: boolean;
  appreciations: ArtworkAppreciation[];
  comments: ArtworkComment[];
  drive_file_id?: string;
  drive_web_link?: string;
  created_at: string;
}

export interface ForumReply {
  id: number;
  post_id: number;
  user_id: number;
  author_name: string;
  author_role: UserRole;
  author_kelas: string;
  content: string;
  created_at: string;
}

export interface ForumPost {
  id: number;
  user_id: number;
  author_name: string;
  author_role: UserRole;
  author_kelas: string;
  topic: string;
  title: string;
  content: string;
  created_at: string;
  replies: ForumReply[];
}

export interface Presentation {
  id: number;
  user_id: number;
  author_name: string;
  author_kelas: string;
  title: string;
  topic: string;
  description: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  drive_file_id?: string;
  drive_web_link?: string;
  created_at: string;
}

export interface QuizSubmission {
  id: number;
  user_id: number;
  student_name: string;
  student_email: string;
  student_kelas: string;
  mc_answers_json: string;
  essay_answers_json: string;
  essay_scores_json: string;
  mc_correct: number;
  mc_total: number;
  mc_score: number;
  essay_score: number;
  final_score: number;
  predicate: string;
  teacher_note: string;
  sheets_synced: number;
  drive_file_id?: string;
  drive_web_link?: string;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  actor_name: string;
  target_tab: string;
  is_read: number;
  created_at: string;
}

export interface ExternalResourceView {
  title: string;
  subtitle: string;
  url: string;
  embedType: 'youtube' | 'iframe' | 'external';
  youtubeId?: string;
}
