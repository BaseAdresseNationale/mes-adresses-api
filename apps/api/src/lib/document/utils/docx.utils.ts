import {
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  Header,
  TableLayoutType,
  ShadingType,
} from 'docx';
import { DocumentDefinition } from '../types';

export const ALIGNMENT_MAP: Record<
  string,
  (typeof AlignmentType)[keyof typeof AlignmentType]
> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

export function buildHeaderSection(definition: DocumentDefinition): Header {
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

export function buildTableFromBlock(block: {
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
              children: [
                new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' }),
              ],
            }),
          ],
          width: {
            size: colWidth,
            type: WidthType.DXA,
          },

          shading: {
            type: ShadingType.CLEAR,
            fill: '2874af',
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
    columnWidths: Array(block.headers.length).fill(colWidth),
    layout: TableLayoutType.FIXED,
  });
}

export function extractImageData(dataUrl: string): Buffer {
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}
