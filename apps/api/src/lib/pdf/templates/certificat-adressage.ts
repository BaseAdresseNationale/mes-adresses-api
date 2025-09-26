import { PdfDocument, xMargin, yMargin } from '../PDFDocument';
import { Numero } from '@/shared/entities/numero.entity';
import { PDFAssetsManager } from '../PDFAssetsManager';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { GenerateCertificatDTO } from '@/modules/numeros/dto/generate_certificat.dto';
import { getCommuneFlagBase64PNG } from '@/lib/utils/commune-flag.utils';
import { getAdresseMairie } from '@/lib/utils/annuaire-service-public';

type CertificatAdressageParams = {
  baseLocale: BaseLocale;
  numero: Numero;
  voie: Voie;
  toponyme?: Toponyme;
} & GenerateCertificatDTO;

export async function generateCertificatAdressage(
  params: CertificatAdressageParams,
): Promise<string> {
  const { numero, baseLocale, voie, toponyme, emetteur, destinataire } = params;

  const adresseMairie = await getAdresseMairie(baseLocale.commune);
  const communeLogo = await getCommuneFlagBase64PNG(baseLocale.commune);

  if (!PDFAssetsManager.isInitialized) {
    await PDFAssetsManager.init();
  }

  const doc = new PdfDocument();

  return doc
    .changeFont('Arial', PDFAssetsManager.getArialFont())
    .addImage(PDFAssetsManager.getRFLogo(), 'png', {
      width: 100,
      height: 100,
      x: xMargin,
      y: yMargin,
    })
    .addImage(communeLogo, 'png', {
      width: 50,
      height: 50,
      x: doc.getDocumentInstance().internal.pageSize.width - xMargin * 2 - 50,
      y: yMargin + 25,
    })
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .changeFontSize(12)
    .addText(adresseMairie, {
      align: 'right',
    })
    .addNewLine()
    .addText(
      `${baseLocale.communeNom}, le ${new Date().toLocaleDateString('fr-Fr', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`,
      {
        align: 'right',
      },
    )
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .addNewLine()
    .changeFontSize(20)
    .addText("Certificat d'adressage", {
      align: 'center',
    })
    .addNewLine()
    .changeFontSize(12)
    .addText(
      `Je, soussigné(e) ${emetteur}, atteste que ${
        destinataire
          ? `la propriété appartenant à ${destinataire} désignée ci-dessous `
          : `l'adresse désignée ci-dessous `
      }est certifiée dans la Base Adresse Locale de ${baseLocale.communeNom}.`,
      { align: 'left' },
    )
    .addGenericTable(
      [
        'N° de voirie et désignation de la voie',
        'N° parcelle(s) cadastrale(s)',
      ],
      [
        [
          `${numero.numero} ${voie.nom}${
            toponyme ? `\n${toponyme.nom}` : ''
          }\n${baseLocale.communeNom}`,
          numero.parcelles.join(', '),
        ],
      ],

      {},
    )
    .addNewLine()
    .addNewLine()
    .addText(
      'En foi de quoi, le présent certificat est délivré au demandeur pour servir et valoir ce que de droit.',
      { align: 'left' },
    )
    .addText(
      "Il ne vaut pas : autorisation d'urbanisme, droit de passage, servitude, droit de propriété, certificat de résidence ou d'hébergement.",
      { align: 'left' },
    )
    .render();
}
