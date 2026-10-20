import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { Filesystem, Directory } from '@capacitor/filesystem';

export async function openPdfExternal(relativePath: string): Promise<void> {
  const { uri } = await Filesystem.getUri({
    path: relativePath,
    directory: Directory.Documents,
  });
  await FileOpener.openFile({
    path: uri,
    mimeType: 'application/pdf',
  });
}