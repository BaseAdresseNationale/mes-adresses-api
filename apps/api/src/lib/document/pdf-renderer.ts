import { DocumentDefinition } from './types';
import { PdfDocument, xMargin } from './utils/PDFDocument';

export async function renderPdf(
  definition: DocumentDefinition,
): Promise<string> {
  const doc = new PdfDocument();
  const maxWidth = doc.getDocInstance().internal.pageSize.width - 2 * xMargin;

  await doc.initDocument(definition.title, definition.header.commune);

  for (const block of definition.blocks) {
    switch (block.type) {
      case 'text':
        doc.addText(block.text, {
          align: block.align,
          ...(block.useMaxWidth || block.align === 'justify'
            ? { maxWidth }
            : {}),
        });
        break;
      case 'table':
        doc.addGenericTable(block.headers, block.rows, {});
        break;
      case 'newLine':
        doc.addNewLine();
        break;
      case 'newPage':
        doc.addNewPage();
        break;
      case 'fontSize':
        doc.changeFontSize(block.size);
        break;
      case 'image':
        doc.addImage(block.dataUrl, block.format, {
          width: maxWidth,
          height: block.originalHeight * (maxWidth / block.originalWidth),
        });
        break;
    }
  }

  return doc.render();
}
