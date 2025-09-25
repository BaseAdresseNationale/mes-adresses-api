import { PdfDocument, xMargin, yMargin } from '../PDFDocument';
import { Numero } from '@/shared/entities/numero.entity';
import { PDFAssetsManager } from '../PDFAssetsManager';

interface CertificatAdressageParams {
  numero: Numero;
}

export async function generateCertificatAdressage(
  params: CertificatAdressageParams,
): Promise<ArrayBuffer> {
  const { numero } = params;

  if (!PDFAssetsManager.isInitialized) {
    await PDFAssetsManager.init();
  }

  return (
    new PdfDocument()
      .changeFont('Arial', PDFAssetsManager.getArialFont())
      /* .addImage(PDFAssetsManager.getRFLogo(), 'png', {
      width: 60,
      height: 60,
      x: xMargin,
      y: yMargin,
    }) */
      .addImage(PDFAssetsManager.getBALLogo(), 'png', {
        width: 256,
        height: 256,
        x: 0,
        y: 0,
      })
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .changeFontSize(18)
      .addText("Certificat d'adressage", {
        align: 'center',
      })
      .addNewLine()
      .addNewLine()
      .changeFontSize(12)
      .addText(
        `Je soussigné(e) ${numero.numero}, certifie que le numéro d'adresse suivant :`,
        { align: 'left' },
      )
      .render({ withPageNumber: false, withIndex: false })
  );
}
