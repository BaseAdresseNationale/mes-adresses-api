import { getImageDimensions } from '@/lib/utils/image.utils';
import { PdfDocument, xMargin } from '../../PDFDocument';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';

type ArreteDeNumerotationParams = {
  baseLocale: BaseLocale;
  voie: Voie;
  planDeSituation?: Express.Multer.File;
};

export async function generateArreteDeNumerotation(
  params: ArreteDeNumerotationParams,
): Promise<string> {
  const { baseLocale, voie, planDeSituation } = params;

  let planDeSituationDataUrl = '';
  let planDeSituationDimensions: { width: number; height: number } | null =
    null;
  let imageFormat = '';
  if (planDeSituation) {
    const base64PlanDeSituation = planDeSituation.buffer.toString('base64');
    imageFormat = planDeSituation.mimetype.replace('image/', '');
    if (!['png', 'jpeg', 'jpg'].includes(imageFormat)) {
      throw new Error('Invalid file type. Only PNG and JPEG are allowed.');
    }
    planDeSituationDataUrl = `data:image/${imageFormat};base64,${base64PlanDeSituation}`;
    planDeSituationDimensions = await getImageDimensions(
      planDeSituationDataUrl,
    );
  }

  const doc = new PdfDocument();
  const maxWidth = doc.getDocInstance().internal.pageSize.width - 2 * xMargin;

  await doc.initDocument('Arrêté de numérotation', {
    nom: baseLocale.communeNom,
    code: baseLocale.commune,
  });

  doc
    .addText(`Le Maire de la commune de ${baseLocale.communeNom},`, {
      align: 'left',
    })
    .addText(
      `Vu le code général des collectivités territoriales et notamment son article L.2213-28,`,
      {
        align: 'justify',
        maxWidth,
      },
    )
    .addText(
      `Vu l'article R.610-5 du code pénal qui prévoit que la violation des interdictions ou le manquement aux obligations édictées par les décrets et arrêtés de police sont punis de l'amende prévue pour les contraventions de la 1ere classe,`,
      {
        align: 'justify',
        maxWidth,
      },
    )
    .addText(
      `Considérant que le numérotage des habitations en agglomération constitue une mesure de police générale que seul le Maire peut prescrire,`,
      {
        align: 'justify',
        maxWidth,
      },
    )
    .addText(
      `Considérant que dans les communes où l'opération est nécessaire, le numérotage des maisons est exécuté pour la première fois à la charge de la commune,`,
      {
        align: 'justify',
        maxWidth,
      },
    )
    .addNewPage()
    .changeFontSize(20)
    .addText(`ARRÊTÉ :`, {
      align: 'center',
    })
    .changeFontSize(12)
    .addNewLine()
    .addText(
      `Article 1 : L’accès aux locaux se fait par la voie ${voie.nom}. Le
numérotage des parcelles cadastrées precrit suivant le tableau ci-dessous :`,
      {
        align: 'justify',
      },
    )
    .addGenericTable(
      ['Numéro', 'Parcelle(s) cadastrale(s) associée(s)'],
      voie.numeros
        .sort((a, b) => {
          if (a.numero !== b.numero) return a.numero - b.numero;
          const suffixA = a.suffixe || '';
          const suffixB = b.suffixe || '';
          return suffixA.localeCompare(suffixB);
        })
        .map(({ numeroComplet, parcelles }) => [
          `${numeroComplet}`,
          parcelles.join(', ') || '-',
        ]),
      {},
    )
    .addNewLine()
    .addNewLine()
    .addText(
      `Article 2 : Un plan de numérotage sera déposé aux services techniques et mis à la
disposition du public.`,
      {
        align: 'justify',
        maxWidth,
      },
    )
    .addNewLine()
    .addText(
      `Article 3 : Les numéros seront fournis et fixés par la commune dont l’entretien
incombera aux propriétaires riverains.`,
      {
        align: 'justify',
        maxWidth,
      },
    );

  if (planDeSituation) {
    doc
      .addNewPage()
      .addNewLine()
      .addText('Plan de situation :', { align: 'left' })
      .addImage(planDeSituationDataUrl, imageFormat as 'png' | 'jpeg' | 'jpg', {
        width: maxWidth,
        height:
          planDeSituationDimensions.height *
          (maxWidth / planDeSituationDimensions.width),
      });
  }

  return doc.render();
}
