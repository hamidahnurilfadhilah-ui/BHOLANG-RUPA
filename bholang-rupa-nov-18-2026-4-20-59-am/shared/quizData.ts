export interface MultipleChoiceQuestion {
  id: number;
  topic: 'Unsur Seni Rupa' | 'Prinsip Seni Rupa';
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface EssayQuestion {
  id: number;
  topic: 'Unsur Seni Rupa' | 'Prinsip Seni Rupa';
  question: string;
  rubricKeywords: string[];
  maxScore: number;
  sampleAnswer: string;
}

export const QUIZ_MC_QUESTIONS: MultipleChoiceQuestion[] = [
  {
    id: 1,
    topic: 'Unsur Seni Rupa',
    question: 'Unsur seni rupa yang paling dasar dan menjadi awal mula terbentuknya garis maupun bidang adalah...',
    options: ['Titik', 'Bentuk', 'Tekstur', 'Gelap Terang'],
    correctIndex: 0,
    explanation: 'Titik merupakan unsur seni rupa paling sederhana yang jika digabungkan atau digerakkan akan membentuk garis.'
  },
  {
    id: 2,
    topic: 'Unsur Seni Rupa',
    question: 'Kesan karakter yang timbul dari penggunaan garis zig-zag atau patah-patah dalam sebuah karya seni rupa adalah...',
    options: ['Tenang dan damai', 'Kaku, tegas, atau penuh ketegangan', 'Lembut dan gemulai', 'Lambat dan statis'],
    correctIndex: 1,
    explanation: 'Garis zig-zag memiliki sudut tajam yang memunculkan kesan dinamis, ketegangan, guncangan, dan ketegasan.'
  },
  {
    id: 3,
    topic: 'Unsur Seni Rupa',
    question: 'Pertemuan beberapa garis yang ujungnya saling menyambung dan menutup suatu area dua dimensi disebut...',
    options: ['Ruang', 'Titik', 'Bidang', 'Volume'],
    correctIndex: 2,
    explanation: 'Bidang terbentuk ketika garis bertemu di kedua ujungnya dan membentuk permukaan pipih dua dimensi (panjang dan lebar).'
  },
  {
    id: 4,
    topic: 'Unsur Seni Rupa',
    question: 'Perbedaan utama antara "bidang" (shape) dan "bentuk" (form) dalam seni rupa adalah...',
    options: [
      'Bidang selalu berwarna gelap sedangkan bentuk selalu terang',
      'Bidang bersifat 2 dimensi sedangkan bentuk memiliki volume 3 dimensi',
      'Bidang hanya dibuat oleh komputer sedangkan bentuk dibuat manual',
      'Bidang tidak memiliki batas garis sedangkan bentuk memiliki garis tebal'
    ],
    correctIndex: 1,
    explanation: 'Bidang memiliki ukuran panjang dan lebar (2D), sedangkan bentuk (form) mempunyai volume/isi yakni panjang, lebar, dan tinggi/kedalaman (3D).'
  },
  {
    id: 5,
    topic: 'Unsur Seni Rupa',
    question: 'Kelompok warna yang termasuk warna primer dalam teori warna pigmen seni rupa (RYB) adalah...',
    options: [
      'Merah, Hijau, dan Biru',
      'Oranye, Hijau, dan Ungu',
      'Merah, Kuning, dan Biru',
      'Kuning, Ungu, dan Cokelat'
    ],
    correctIndex: 2,
    explanation: 'Dalam teori warna pigmen (seni rupa), warna primer murni adalah Merah, Kuning, dan Biru karena tidak dapat dihasilkan dari campuran warna lain.'
  },
  {
    id: 6,
    topic: 'Unsur Seni Rupa',
    question: 'Jika warna primer Kuning dicampur dengan warna primer Biru dengan perbandingan seimbang, warna sekunder yang dihasilkan adalah...',
    options: ['Oranye', 'Ungu', 'Hijau', 'Cokelat'],
    correctIndex: 2,
    explanation: 'Kuning + Biru menghasilkan warna sekunder Hijau; Merah + Kuning = Oranye; Merah + Biru = Ungu.'
  },
  {
    id: 7,
    topic: 'Unsur Seni Rupa',
    question: 'Pasangan warna yang letaknya saling berseberangan tepat pada lingkaran warna sehingga menciptakan kontras tinggi disebut warna...',
    options: ['Analogus', 'Monokromatik', 'Komplementer', 'Tersier'],
    correctIndex: 2,
    explanation: 'Warna komplementer adalah dua warna yang berseberangan di roda warna (misalnya Merah dengan Hijau, atau Biru dengan Oranye).'
  },
  {
    id: 8,
    topic: 'Unsur Seni Rupa',
    question: 'Tekstur pada lukisan yang tampak kasar bila dilihat mata, namun terasa licin ketika diraba oleh tangan disebut tekstur...',
    options: ['Nyata', 'Semu', 'Organis', 'Geometris'],
    correctIndex: 1,
    explanation: 'Tekstur semu (visual texture) hanya memberikan kesan rabaan secara visual melalui teknik bayangan/arsiran, sedangkan permukaannya tetap halus.'
  },
  {
    id: 9,
    topic: 'Unsur Seni Rupa',
    question: 'Fungsi utama unsur gelap terang (value) dalam menggambar benda tiga dimensi di atas kertas adalah...',
    options: [
      'Menghilangkan bayangan agar objek tampak datar',
      'Menciptakan kesan volume, kedalaman, dan arah datangnya cahaya',
      'Membatasi jumlah warna primer yang digunakan',
      'Membuat garis tepi objek selalu rata dan seragam'
    ],
    correctIndex: 1,
    explanation: 'Gradasi gelap terang (value) membangun ilusi volume, ruang, serta menunjukkan bagian objek yang terkena cahaya dan yang terbayangi.'
  },
  {
    id: 10,
    topic: 'Unsur Seni Rupa',
    question: 'Dalam seni rupa dua dimensi, ruang positif dan ruang negatif merujuk pada...',
    options: [
      'Ruang yang berada di dalam galeri dan di luar galeri',
      'Area yang ditempati objek utama dan area kosong di sekitar objek',
      'Warna panas di sisi kiri dan warna dingin di sisi kanan',
      'Sketsa pensil sebelum diwarnai cat akrilik'
    ],
    correctIndex: 1,
    explanation: 'Ruang positif adalah wilayah yang diisi oleh objek gambar, sedangkan ruang negatif adalah ruang kosong yang mengelilingi dan membingkai objek.'
  },
  {
    id: 11,
    topic: 'Prinsip Seni Rupa',
    question: 'Prinsip seni rupa yang mengatur keterpaduan seluruh unsur rupa sehingga tidak terkesan terpisah-pisah atau tercerai-berai adalah...',
    options: ['Kesatuan (Unity)', 'Penekanan (Emphasis)', 'Kontras', 'Distorsi'],
    correctIndex: 0,
    explanation: 'Kesatuan (unity) menyatukan seluruh unsur visual agar karya terlihat sebagai satu kesatuan utuh yang saling mendukung.'
  },
  {
    id: 12,
    topic: 'Prinsip Seni Rupa',
    question: 'Penataan objek pada sisi kiri dan kanan yang berbeda bentuk maupun ukurannya, namun tetap terasa seimbang secara bobot visual disebut keseimbangan...',
    options: ['Simetris', 'Asimetris', 'Sentral', 'Vertikal'],
    correctIndex: 1,
    explanation: 'Keseimbangan asimetris tercapai bukan karena sisi kiri dan kanan identik, melainkan melalui penimbangan bobot visual, warna, atau jarak.'
  },
  {
    id: 13,
    topic: 'Prinsip Seni Rupa',
    question: 'Keseimbangan yang disusun memancar atau melingkar dari satu titik pusat di tengah karya seperti motif mandala disebut keseimbangan...',
    options: ['Simetris linear', 'Asimetris bebas', 'Radial', 'Diagonal'],
    correctIndex: 2,
    explanation: 'Keseimbangan radial mengatur elemen desain secara melingkar atau memancar dari titik pusat komposisi.'
  },
  {
    id: 14,
    topic: 'Prinsip Seni Rupa',
    question: 'Pengulangan unsur garis, bentuk, atau warna secara teratur maupun progresif untuk menciptakan kesan gerak mata disebut prinsip...',
    options: ['Proporsi', 'Irama (Rhythm)', 'Gradasi', 'Netralitas'],
    correctIndex: 1,
    explanation: 'Irama (rhythm) terbentuk dari pengulangan unsur secara teratur, bergantian, atau progresif sehingga mengarahkan gerak mata penikmat karya.'
  },
  {
    id: 15,
    topic: 'Prinsip Seni Rupa',
    question: 'Seorang ilustrator membuat satu objek bunga berwarna merah menyala di tengah hamparan daun hijau yang redup. Prinsip yang paling ditonjolkan adalah...',
    options: ['Penekanan (Emphasis / Focal Point)', 'Repetisi statis', 'Keseimbangan simetris', 'Monotoni'],
    correctIndex: 0,
    explanation: 'Penekanan (emphasis) menonjolkan bagian tertentu sebagai pusat perhatian (focal point) melalui kontras warna, ukuran, atau letak.'
  },
  {
    id: 16,
    topic: 'Prinsip Seni Rupa',
    question: 'Prinsip perbandingan ukuran antara bagian satu dengan bagian lain serta terhadap keseluruhan tubuh atau objek disebut...',
    options: ['Tekstur', 'Proporsi', 'Irama', 'Aksentuasi'],
    correctIndex: 1,
    explanation: 'Proporsi mengatur kesebandingan ukuran antarbagian objek (misalnya perbandingan kepala terhadap tubuh manusia).'
  },
  {
    id: 17,
    topic: 'Prinsip Seni Rupa',
    question: 'Keselarasan (harmony) dalam sebuah karya desain grafis atau lukisan dapat dibangun dengan cara...',
    options: [
      'Menggunakan semua warna neon secara acak tanpa batas',
      'Menggunakan palet warna analogus dan pengulangan bentuk yang serasi',
      'Menghapus seluruh unsur garis dan bidang dari bidang gambar',
      'Membuat semua objek tumpang tindih tanpa ruang negatif'
    ],
    correctIndex: 1,
    explanation: 'Keselarasan muncul dari kedekatan karakter antarunsur, seperti palet warna analogus atau keserasian karakter bentuk.'
  },
  {
    id: 18,
    topic: 'Prinsip Seni Rupa',
    question: 'Prinsip kontras sangat penting dalam komposisi seni rupa karena berfungsi untuk...',
    options: [
      'Menghilangkan perbedaan antarelemen gambar',
      'Mencegah kesan monoton dan memperjelas daya tarik visual',
      'Membuat seluruh gambar bernuansa abu-abu seragam',
      'Mengurangi jumlah unsur titik dan garis'
    ],
    correctIndex: 1,
    explanation: 'Kontras memadukan unsur-unsur yang berlawanan (terang-gelap, besar-kecil, kasar-halus) agar karya terasa hidup dan tidak membosankan.'
  },
  {
    id: 19,
    topic: 'Prinsip Seni Rupa',
    question: 'Perubahan ukuran objek dari besar ke kecil secara bertahap pada barisan tiang atau dedaunan merupakan penerapan irama jenis...',
    options: ['Irama repetitif seragam', 'Irama progresif (gradasi)', 'Irama acak', 'Irama simetris'],
    correctIndex: 1,
    explanation: 'Irama progresif menghadirkan perubahan bertahap (ukuran, warna, atau jarak) yang menimbulkan kesan gerak mengalir dan perspektif.'
  },
  {
    id: 20,
    topic: 'Prinsip Seni Rupa',
    question: 'Saat merancang poster pameran seni sekolah kelas X SMK, urutan pertimbangan prinsip agar informasi mudah dibaca adalah...',
    options: [
      'Membuat semua teks berukuran sama agar tidak ada penekanan',
      'Menentukan titik fokus utama (emphasis), menjaga keseimbangan tata letak, dan menyelaraskan kontras teks dengan latar',
      'Mengisi 100% bidang poster dengan warna komplementer berintensitas penuh',
      'Menghilangkan ruang kosong (ruang negatif) di seluruh tepi poster'
    ],
    correctIndex: 1,
    explanation: 'Poster yang efektif memadukan penekanan hierarki visual, keseimbangan komposisi, kontras keterbacaan, dan ruang negatif yang lega.'
  }
];

export const QUIZ_ESSAY_QUESTIONS: EssayQuestion[] = [
  {
    id: 1,
    topic: 'Unsur Seni Rupa',
    question: 'Jelaskan perbedaan antara tekstur nyata dan tekstur semu dalam seni rupa, serta berikan masing-masing satu contoh penerapannya!',
    rubricKeywords: ['nyata', 'semu', 'diraba', 'dilihat', 'visual', 'kasar', 'halus', 'kolase', 'arsir'],
    maxScore: 20,
    sampleAnswer: 'Tekstur nyata adalah sifat permukaan yang nilai raba dan penglihatannya sama (misal kolase pasir atau ukiran kayu), sedangkan tekstur semu tampak kasar secara visual lewat arsiran atau cat namun terasa halus saat diraba.'
  },
  {
    id: 2,
    topic: 'Unsur Seni Rupa',
    question: 'Bagaimana proses pencampuran warna primer untuk menghasilkan warna sekunder dan warna tersier? Sertakan contoh kombinasinya!',
    rubricKeywords: ['primer', 'sekunder', 'tersier', 'merah', 'kuning', 'biru', 'hijau', 'oranye', 'ungu', 'campur'],
    maxScore: 20,
    sampleAnswer: 'Warna primer (merah, kuning, biru) dicampur dua warna menghasilkan warna sekunder (oranye, hijau, ungu). Warna tersier diperoleh dengan mencampur satu warna primer dan satu warna sekunder yang berdekatan, seperti kuning-hijau.'
  },
  {
    id: 3,
    topic: 'Prinsip Seni Rupa',
    question: 'Uraikan perbedaan prinsip keseimbangan simetris dan keseimbangan asimetris serta kapan sebaiknya masing-masing digunakan dalam karya desain!',
    rubricKeywords: ['simetris', 'asimetris', 'seimbang', 'sama', 'identik', 'dinamis', 'formal', 'bobot', 'visual'],
    maxScore: 20,
    sampleAnswer: 'Keseimbangan simetris menempatkan unsur yang sama persis di sisi berlawanan sehingga terkesan formal dan kokoh. Keseimbangan asimetris menyeimbangkan unsur berbeda lewat bobot visual warna/ukuran sehingga lebih dinamis dan modern.'
  },
  {
    id: 4,
    topic: 'Prinsip Seni Rupa',
    question: 'Mengapa prinsip penekanan (emphasis) dan kontras dibutuhkan dalam sebuah karya ilustrasi atau poster SMK? Jelaskan cara mewujudkannya!',
    rubricKeywords: ['fokus', 'perhatian', 'kontras', 'warna', 'ukuran', 'letak', 'monoton', 'utama', 'emphasis'],
    maxScore: 20,
    sampleAnswer: 'Penekanan dan kontras mengarahkan mata audiens langsung ke pesan utama agar karya tidak monoton. Dapat diwujudkan dengan warna kontras, perbedaan ukuran objek, penempatan di titik fokus, atau isolasi ruang negatif.'
  },
  {
    id: 5,
    topic: 'Prinsip Seni Rupa',
    question: 'Pilih satu karya seni atau desain di sekitar Anda (misal batik, poster, atau lukisan pemandangan), lalu analisis minimal 3 unsur dan 2 prinsip seni rupa yang terdapat di dalamnya!',
    rubricKeywords: ['garis', 'warna', 'bentuk', 'bidang', 'tekstur', 'irama', 'kesatuan', 'keseimbangan', 'proporsi', 'harmoni'],
    maxScore: 20,
    sampleAnswer: 'Pada motif batik parang terdapat unsur garis lengkung diagonal, bidang geometris berulang, serta warna sogan dan krem yang harmonis. Prinsip yang menonjol adalah irama pengulangan motif yang dinamis dan kesatuan komposisi.'
  }
];

export function evaluateEssayAnswer(answer: string, question: EssayQuestion): { score: number; matchedKeywords: string[] } {
  const normalized = (answer || '').toLowerCase().trim();
  if (!normalized || normalized.length < 12) {
    return { score: 0, matchedKeywords: [] };
  }
  const matched = question.rubricKeywords.filter((kw) => normalized.includes(kw.toLowerCase()));
  const keywordRatio = Math.min(1, matched.length / Math.max(3, Math.ceil(question.rubricKeywords.length * 0.45)));
  const lengthBonus = normalized.length >= 80 ? 0.2 : normalized.length >= 35 ? 0.1 : 0;
  const rawFraction = Math.min(1, keywordRatio * 0.8 + lengthBonus);
  const score = Math.round(rawFraction * question.maxScore);
  return { score, matchedKeywords: matched };
}
