import {
  DocumentBlock,
  DocumentDefinition,
  DocumentHeader,
  ImageBlock,
} from '../../types';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { buildArretePreambleBlocks } from '../shared/arrete-preamble';

export type ArreteDeNumerotationVoieParams = {
  baseLocale: BaseLocale;
  voie: Voie;
  planDeSituation?: ImageBlock;
};

export function buildArreteDeNumerotationVoieBlocks(
  params: ArreteDeNumerotationVoieParams,
): DocumentBlock[] {
  const { baseLocale, voie, planDeSituation } = params;

  const blocks: DocumentBlock[] = [
    ...buildArretePreambleBlocks(baseLocale.communeNom),
    { type: 'newPage' },
    { type: 'fontSize', size: 20 },
    { type: 'text', text: 'ARRÊTÉ :', align: 'center' },
    { type: 'fontSize', size: 12 },
    { type: 'newLine' },
    {
      type: 'text',
      text: `Article 1 : L'accès aux locaux se fait par la voie ${voie.nom}. Le
numérotage des parcelles cadastrées precrit suivant le tableau ci-dessous :`,
      align: 'justify',
    },
    {
      type: 'table',
      headers: ['Numéro', 'Parcelle(s) cadastrale(s) associée(s)'],
      rows: voie.numeros
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
    },
    { type: 'newLine' },
    { type: 'newLine' },
    {
      type: 'text',
      text: `Article 2 : Un plan de numérotage sera déposé aux services techniques et mis à la
disposition du public.`,
      align: 'justify',
      useMaxWidth: true,
    },
    { type: 'newLine' },
    {
      type: 'text',
      text: `Article 3 : Les numéros seront fournis et fixés par la commune dont l'entretien
incombera aux propriétaires riverains.`,
      align: 'justify',
      useMaxWidth: true,
    },
  ];

  if (planDeSituation) {
    blocks.push(
      { type: 'newPage' },
      { type: 'newLine' },
      { type: 'text', text: 'Plan de situation :', align: 'left' },
      planDeSituation,
    );
  }

  return blocks;
}

export function buildArreteDeNumerotationVoieDefinition(
  header: DocumentHeader,
  params: ArreteDeNumerotationVoieParams,
): DocumentDefinition {
  return {
    title: 'Arrêté de numérotation',
    header,
    blocks: buildArreteDeNumerotationVoieBlocks(params),
  };
}
