import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const TARGET_DRIVE_FOLDER_ID = '1TkzEz7v37vqse7NDGpANNhaGbV5pUdJ0';
export const TARGET_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/folders/1TkzEz7v37vqse7NDGpANNhaGbV5pUdJ0?usp=sharing';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'consent' });

// Strict in-memory caching for OAuth access token (never localStorage/sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedGoogleUser: FirebaseUser | null = null;

export function initGoogleWorkspaceAuth(
  onUpdate: (state: { user: FirebaseUser | null; accessToken: string | null }) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user && cachedAccessToken) {
      cachedGoogleUser = user;
      onUpdate({ user, accessToken: cachedAccessToken });
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      cachedGoogleUser = user;
      onUpdate({ user, accessToken: null });
    }
  });
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: FirebaseUser;
  accessToken: string;
}> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Drive & Sheets.');
    }
    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
}

export async function signOutGoogleWorkspace(): Promise<void> {
  await signOut(auth);
  cachedAccessToken = null;
  cachedGoogleUser = null;
}

export function getGoogleAccessToken(): string | null {
  return cachedAccessToken;
}

export function getGoogleUser(): FirebaseUser | null {
  return cachedGoogleUser;
}

// ==================== GOOGLE DRIVE API v3 ====================
export type DriveCategoryFolder =
  | '01_Karya_Siswa'
  | '02_Presentasi_Siswa'
  | '03_Hasil_Kuis_dan_Nilai';

export interface DriveFileResult {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  size?: string;
}

async function ensureSubfolder(
  accessToken: string,
  parentFolderId: string,
  subfolderName: string
): Promise<string> {
  const query = encodeURIComponent(
    `name='${subfolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (searchRes.ok) {
    const data = (await searchRes.json()) as { files?: Array<{ id: string }> };
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: subfolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentFolderId],
      }),
    }
  );

  if (!createRes.ok) {
    // Fallback to parent folder if user only has read/limited permission on shared folder
    return parentFolderId;
  }
  const created = (await createRes.json()) as { id: string };
  return created.id || parentFolderId;
}

export async function uploadBlobToDrive(
  accessToken: string,
  options: {
    blob: Blob;
    fileName: string;
    mimeType: string;
    categoryFolder: DriveCategoryFolder;
    rootFolderId?: string;
  }
): Promise<DriveFileResult> {
  const rootId = options.rootFolderId || TARGET_DRIVE_FOLDER_ID;
  const targetFolderId = await ensureSubfolder(accessToken, rootId, options.categoryFolder);

  const metadata = {
    name: options.fileName,
    parents: [targetFolderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', options.blob, options.fileName);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,webContentLink,createdTime&supportsAllDrives=true',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Gagal mengunggah ke Google Drive: ${errText}`);
  }

  return (await uploadRes.json()) as DriveFileResult;
}

export async function listDriveFolderFiles(
  accessToken: string,
  folderId: string = TARGET_DRIVE_FOLDER_ID
): Promise<DriveFileResult[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=folder,createdTime desc&fields=files(id,name,mimeType,webViewLink,webContentLink,createdTime,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    throw new Error('Tidak dapat membaca isi folder Google Drive. Pastikan akun memiliki akses ke folder.');
  }
  const data = (await res.json()) as { files?: DriveFileResult[] };
  return data.files || [];
}

// ==================== GOOGLE SHEETS API v4 ====================
const SPREADSHEET_TITLE = 'Rekap Nilai BHOLANG RUPA - Kelas X SMK';

export async function ensureGradeSpreadsheet(
  accessToken: string,
  existingSpreadsheetId?: string,
  rootFolderId: string = TARGET_DRIVE_FOLDER_ID
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; sheetTitle: string }> {
  if (existingSpreadsheetId) {
    const checkRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${existingSpreadsheetId}?fields=spreadsheetId,spreadsheetUrl,sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (checkRes.ok) {
      const meta = (await checkRes.json()) as {
        spreadsheetId: string;
        spreadsheetUrl: string;
        sheets?: Array<{ properties?: { title?: string } }>;
      };
      return {
        spreadsheetId: meta.spreadsheetId,
        spreadsheetUrl: meta.spreadsheetUrl,
        sheetTitle: meta.sheets?.[0]?.properties?.title || 'Sheet1',
      };
    }
  }

  // Search Drive for existing spreadsheet inside folder
  const query = encodeURIComponent(
    `name='${SPREADSHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (searchRes.ok) {
    const found = (await searchRes.json()) as { files?: Array<{ id: string; webViewLink?: string }> };
    if (found.files && found.files.length > 0) {
      const sheetId = found.files[0].id;
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=spreadsheetId,spreadsheetUrl,sheets.properties.title`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (metaRes.ok) {
        const meta = (await metaRes.json()) as {
          spreadsheetId: string;
          spreadsheetUrl: string;
          sheets?: Array<{ properties?: { title?: string } }>;
        };
        return {
          spreadsheetId: meta.spreadsheetId,
          spreadsheetUrl: meta.spreadsheetUrl,
          sheetTitle: meta.sheets?.[0]?.properties?.title || 'Sheet1',
        };
      }
    }
  }

  // Create new Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: SPREADSHEET_TITLE },
      sheets: [{ properties: { title: 'Rekap Nilai Kelas X' } }],
    }),
  });

  if (!createRes.ok) {
    const txt = await createRes.text();
    throw new Error(`Gagal membuat Google Spreadsheet: ${txt}`);
  }

  const created = (await createRes.json()) as {
    spreadsheetId: string;
    spreadsheetUrl: string;
    sheets?: Array<{ properties?: { title?: string } }>;
  };
  const sheetTitle = created.sheets?.[0]?.properties?.title || 'Rekap Nilai Kelas X';

  // Move Spreadsheet into target subfolder 03_Hasil_Kuis_dan_Nilai
  try {
    const subId = await ensureSubfolder(accessToken, rootFolderId, '03_Hasil_Kuis_dan_Nilai');
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${created.spreadsheetId}?addParents=${subId}&supportsAllDrives=true`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  } catch {
    // Non-fatal if user has no move permission
  }

  // Write Header Row
  const encodedRange = encodeURIComponent(`'${sheetTitle}'!A1:J1`);
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          [
            'Waktu Kirim',
            'Nama Siswa',
            'Kelas',
            'Email',
            'Benar PG',
            'Skor PG (70%)',
            'Skor Esai (30%)',
            'Nilai Akhir',
            'Predikat',
            'Catatan Guru',
          ],
        ],
      }),
    }
  );

  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl: created.spreadsheetUrl,
    sheetTitle,
  };
}

export async function appendGradeRowToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  row: Array<string | number>
): Promise<void> {
  const encodedRange = encodeURIComponent(`'${sheetTitle}'!A:J`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gagal menulis nilai ke Google Sheets: ${txt}`);
  }
}
