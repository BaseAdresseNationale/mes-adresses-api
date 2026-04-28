import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  ImageRun,
  PageBreak,
} from 'docx';
import { DocumentDefinition } from './types';
import { AssetsManager } from './utils/AssetsManager';
import {
  ALIGNMENT_MAP,
  buildHeaderSection,
  buildTableFromBlock,
  extractImageData,
} from './utils/docx.utils';

export async function renderDocx(
  definition: DocumentDefinition,
): Promise<Buffer> {
  if (!AssetsManager.isInitialized) {
    await AssetsManager.init();
  }

  const header = buildHeaderSection(definition);

  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: definition.title,
          bold: true,
          size: 40,
        }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: '' })] }),
  );

  let currentFontSize = 24; // default 12pt in half-points

  for (const block of definition.blocks) {
    switch (block.type) {
      case 'text':
        children.push(
          new Paragraph({
            alignment: ALIGNMENT_MAP[block.align] || AlignmentType.LEFT,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: block.text,
                size: currentFontSize,
              }),
            ],
          }),
        );
        break;
      case 'table':
        children.push(buildTableFromBlock(block));
        break;
      case 'newLine':
        children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
        break;
      case 'newPage':
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          }),
        );
        break;
      case 'fontSize':
        currentFontSize = block.size * 2; // docx uses half-points
        break;
      case 'image': {
        const imageBuffer = extractImageData(block.dataUrl);
        const maxWidthEmu = 6_000_000; // ~15.8cm, roughly A4 width minus margins
        const ratio = block.originalHeight / block.originalWidth;
        const widthEmu = maxWidthEmu;
        const heightEmu = Math.round(widthEmu * ratio);
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: imageBuffer,
                transformation: {
                  width: Math.round(widthEmu / 9525), // convert EMU to pixels (approx)
                  height: Math.round(heightEmu / 9525),
                },
                type: 'png',
              }),
            ],
          }),
        );
        break;
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1134, // ~2cm
              bottom: 1440,
              left: 1134,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
