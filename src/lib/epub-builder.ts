import JSZip from 'jszip';

// Собирает EPUB из набора HTML-глав. Минимальный валидный EPUB 3.
export async function buildEpub(opts: {
  title: string;
  author: string;
  coverUrl?: string;
  chapters: { title: string; html: string }[];
}): Promise<Blob> {
  const zip = new JSZip();

  // mimetype обязан быть первым и без сжатия.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const chapterFiles: string[] = [];
  opts.chapters.forEach((ch, i) => {
    const name = `chapter_${String(i + 1).padStart(4, '0')}.xhtml`;
    chapterFiles.push(name);
    zip.file(
      `OEBPS/${name}`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="ru" lang="ru">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeXml(ch.title)}</title>
  <style>
    body { font-family: serif; line-height: 1.6; margin: 1em; }
    h2 { margin: 1em 0 0.5em; }
    p { text-indent: 1.5em; margin: 0.6em 0; }
    p.no-indent { text-indent: 0; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <h2>${escapeXml(ch.title)}</h2>
  ${ch.html}
</body>
</html>`
    );
  });

  const manifestItems = chapterFiles
    .map((f, i) => `<item id="ch${i + 1}" href="${f}" media-type="application/xhtml+xml"/>`)
    .join('\n    ');

  const spineItems = chapterFiles.map((_, i) => `<itemref idref="ch${i + 1}"/>`).join('\n    ');

  const navPoints = opts.chapters
    .map(
      (ch, i) => `<navPoint id="nav${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${escapeXml(ch.title)}</text></navLabel>
      <content src="${chapterFiles[i]}"/>
    </navPoint>`
    )
    .join('\n    ');

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${crypto.randomUUID()}</dc:identifier>
    <dc:title>${escapeXml(opts.title)}</dc:title>
    <dc:creator>${escapeXml(opts.author)}</dc:creator>
    <dc:language>ru</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`
  );

  zip.file(
    'OEBPS/toc.ncx',
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${crypto.randomUUID()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(opts.title)}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`
  );

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
