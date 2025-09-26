import { PdfDocument, xMargin, yMargin } from '../PDFDocument';
import { Numero } from '@/shared/entities/numero.entity';
import { PDFAssetsManager } from '../PDFAssetsManager';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import * as sharp from 'sharp';

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

export async function getAdresseMairie(
  codeCommune: string,
): Promise<string | null> {
  const route =
    'https://api-lannuaire.service-public.fr/api/explore/v2.1/catalog/datasets/api-lannuaire-administration/records';
  const query = `select=nom,adresse&where=code_insee_commune="${codeCommune}" and pivot LIKE "mairie"`;
  const url = `${route}?${query}`;

  const response = await fetch(url);
  const data = await response.json();
  if (!data?.results || data.results.length === 0) {
    return null;
  }

  const mainMarie = data.results.find(
    (result) => !result.nom.toLowerCase().includes('mairie déléguée'),
  );
  const mairieData = mainMarie || data.results[0];
  const adresseMairie = JSON.parse(mairieData.adresse)[0];
  return `${mairieData.nom}\n${adresseMairie.numero_voie}\n${adresseMairie.code_postal} ${adresseMairie.nom_commune}`;
}

export async function generateCertificatAdressage(
  params: CertificatAdressageParams,
): Promise<string> {
  const { numero, baseLocale, voie, toponyme, emetteur, destinataire } = params;

  const adresseMairie = await getAdresseMairie(baseLocale.commune);

  const communeLogoSvgString = await getCommuneFlag(baseLocale.commune);
  const svgBuffer = Buffer.from(communeLogoSvgString, 'utf-8');
  const pngBuffer = await sharp(svgBuffer).png().toBuffer();
  const communeLogo = `data:image/png;base64,${pngBuffer.toString('base64')}`;

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
      `Je, soussigné(e) ${emetteur}, certifie que la propriété appartenant à ${destinataire} est certifiée dans la Base Adresse Locale de ${baseLocale.communeNom}.`,
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
    .render();
}
