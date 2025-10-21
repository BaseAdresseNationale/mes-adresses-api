import { PdfDocument } from '../../PDFDocument';
import { Numero } from '@/shared/entities/numero.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { GenerateCertificatDTO } from '@/modules/numeros/dto/generate_certificat.dto';

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

  const doc = new PdfDocument();
  await doc.initDocument('Certificat de numérotage', {
    nom: baseLocale.communeNom,
    code: baseLocale.commune,
  });

  return doc
    .addText(
      `${
        emetteur
          ? `Je, soussigné(e) ${emetteur}, atteste que `
          : `Le Maire de ${baseLocale.communeNom} atteste que `
      }${
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
