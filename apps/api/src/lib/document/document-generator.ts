import { DocumentDefinition, DocumentFormat } from './types';
import { renderPdf } from './pdf-renderer';
import { renderDocx } from './docx-renderer';

export interface GeneratedDocument {
  data: Buffer;
  contentType: string;
  extension: string;
}

export async function generateDocument(
  definition: DocumentDefinition,
  format: DocumentFormat,
): Promise<GeneratedDocument> {
  switch (format) {
    case DocumentFormat.PDF: {
      const pdfData = await renderPdf(definition);
      return {
        data: Buffer.from(pdfData, 'ascii'),
        contentType: 'application/pdf',
        extension: 'pdf',
      };
    }
    case DocumentFormat.DOCX: {
      const docxBuffer = await renderDocx(definition);
      return {
        data: docxBuffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
      };
    }
    default:
      throw new Error(`Format de document non supporté : ${format}`);
  }
}
