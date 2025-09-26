import { PdfDocument, xMargin, yMargin } from '../PDFDocument';
import { Numero } from '@/shared/entities/numero.entity';
import { PDFAssetsManager } from '../PDFAssetsManager';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';

interface CertificatAdressageParams {
  baseLocale: BaseLocale;
  numero: Numero;
  voie: Voie;
  toponyme?: Toponyme;
  destinataire: string;
  emetteur: string;
}

const BASE_URL =
  'https://base-adresse-locale-prod-blasons-communes.s3.fr-par.scw.cloud';

export const getCommuneFlag = async (codeCommune: string): Promise<string> => {
  const url = `${BASE_URL}/${codeCommune}.svg`;

  const response = await fetch(url, {
    method: 'GET',
  });

  return response.text();
};

export async function generateCertificatAdressage(
  params: CertificatAdressageParams,
): Promise<string> {
  const { numero, baseLocale, voie, toponyme, emetteur, destinataire } = params;

  const communeLogo = await getCommuneFlag(baseLocale.commune);

  console.log('communeLogo', communeLogo);

  if (!PDFAssetsManager.isInitialized) {
    await PDFAssetsManager.init();
  }

  return (
    new PdfDocument()
      .changeFont('Arial', PDFAssetsManager.getArialFont())
      .addImage(PDFAssetsManager.getRFLogo(), 'png', {
        width: 100,
        height: 100,
        x: xMargin,
        y: yMargin,
      })
      /*     .addSVG(communeLogo, {
      width: 100,
      height: 100,
      x: 190 - xMargin - 100,
      y: yMargin,
    }) */
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addText(`Marie de ${baseLocale.communeNom}`, {
        align: 'right',
      })
      .changeFontSize(18)
      .addText("Certificat d'adressage", {
        align: 'center',
      })
      .addNewLine()
      .addNewLine()
      .changeFontSize(12)
      .addText(
        `Je soussigné(e) ${emetteur}, certifie que l'adresse suivante est certifiée dans la Base Adresse Locale à la date du ${new Date().toLocaleDateString(
          'fr-FR',
        )}:`,
        { align: 'left' },
      )
      .addNewLine()
      .addNewLine()
      .addGenericTable(
        [
          {
            'N° de voirie et désignation de la voie': `${numero.numero} ${
              voie.nom
            }${toponyme ? `\n${toponyme.nom}` : ''}\n${baseLocale.communeNom}`,
          },
          {
            'N° parcelle(s) cadastrale(s)': numero.parcelles.join(', '),
          },
        ],
        {},
      )
      .addNewLine()
      .addNewLine()
      .addText(
        'En foi de quoi, le présent certificat est délivré au demandeur pour servir et valoir ce que de droit.',
        { align: 'left' },
      )
      .render({ withPageNumber: false, withIndex: false })
  );
}
