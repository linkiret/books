import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';

const LIB_KEY = 'library';

export interface LibraryItem {
  id: string;
  title: string;
  author: string;
  source: 'ranobelib' | 'flibusta';
  format: 'epub' | 'fb2' | 'pdf';
  filePath: string;
  cover?: string;
  addedAt: number;
}

export async function getLibrary(): Promise<LibraryItem[]> {
  const { value } = await Preferences.get({ key: LIB_KEY });
  return value ? JSON.parse(value) : [];
}

export async function saveLibrary(items: LibraryItem[]): Promise<void> {
  await Preferences.set({ key: LIB_KEY, value: JSON.stringify(items) });
}

export async function addToLibrary(item: LibraryItem): Promise<void> {
  const lib = await getLibrary();
  if (!lib.find((i) => i.id === item.id)) {
    lib.push(item);
    await saveLibrary(lib);
  }
}

export async function removeFromLibrary(id: string): Promise<void> {
  const lib = await getLibrary();
  const item = lib.find((i) => i.id === id);
  const filtered = lib.filter((i) => i.id !== id);
  await saveLibrary(filtered);
  if (item?.filePath) {
    const dir = item.format === 'pdf' ? Directory.Documents : Directory.Data;
    try {
      await Filesystem.deleteFile({ path: item.filePath, directory: dir });
    } catch {
      // файл уже удалён — не страшно
    }
  }
}

export async function readBookBase64(filePath: string): Promise<string> {
  const res = await Filesystem.readFile({ path: filePath, directory: Directory.Data });
  return res.data as string;
}

export async function downloadToFile(url: string, fileName: string): Promise<string> {
  const res = await Filesystem.downloadFile({
    url,
    path: fileName,
    directory: Directory.Data,
  });
  return res.path!;
}

export async function downloadPdf(url: string, fileName: string): Promise<string> {
  const relative = `books/${fileName}`;
  await Filesystem.downloadFile({
    url,
    path: relative,
    directory: Directory.Documents,
  });
  return relative;
}

export async function writeBlobToData(blob: Blob, fileName: string): Promise<string> {
  const base64 = await blobToBase64(blob);
  const res = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Data,
  });
  return res.uri;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
