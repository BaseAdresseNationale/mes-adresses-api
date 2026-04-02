import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  PageBreak,
  Header,
  TableLayoutType,
} from 'docx';
import { DocumentDefinition } from './types';
import { PDFAssetsManager } from '../pdf/PDFAssetsManager';

const ALIGNMENT_MAP: Record<
  string,
  (typeof AlignmentType)[keyof typeof AlignmentType]
> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

function buildHeaderSection(definition: DocumentDefinition): Header {
  const { header } = definition;
  const headerChildren: Paragraph[] = [];

  if (header.communeLogo) {
    const { dataUrl, metadata } = header.communeLogo;
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const ratio = metadata.width / metadata.height;
    const logoHeight = 50;
    const logoWidth = Math.round(logoHeight * ratio);

    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: imageBuffer,
            transformation: {
              width: logoWidth,
              height: logoHeight,
            },
            type: 'png',
          }),
        ],
      }),
    );
  }

  if (header.adresseMairie) {
    const lines = header.adresseMairie.split('\n');
    for (const line of lines) {
      headerChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: line, size: 20 })],
        }),
      );
    }
  }

  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: '', size: 20 })],
    }),
  );

  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: `${header.commune.nom}, le ${header.date}`,
          size: 20,
        }),
      ],
    }),
  );

  return new Header({ children: headerChildren });
}

function buildTableFromBlock(block: {
  headers: string[];
  rows: string[][];
}): Table {
  // A4 width (11906 twips) minus left+right margins (1134 * 2 = 2268 twips)
  const totalTableWidth = 11906 - 2268; // 9638 twips
  const colWidth = Math.floor(totalTableWidth / block.headers.length);

  const headerRow = new TableRow({
    tableHeader: true,
    children: block.headers.map(
      (h) =>
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: h, bold: true, size: 20 })],
            }),
          ],
          width: {
            size: colWidth,
            type: WidthType.DXA,
          },
        }),
    ),
  });

  const dataRows = block.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: cell.split('\n').map(
                (line) =>
                  new Paragraph({
                    children: [new TextRun({ text: line, size: 20 })],
                  }),
              ),
              width: {
                size: colWidth,
                type: WidthType.DXA,
              },
            }),
        ),
      }),
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: totalTableWidth, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
  });
}

function extractImageData(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

export async function renderDocx(
  definition: DocumentDefinition,
): Promise<Buffer> {
  if (!PDFAssetsManager.isInitialized) {
    await PDFAssetsManager.init();
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
