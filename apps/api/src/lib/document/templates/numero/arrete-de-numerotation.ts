import {
  DocumentBlock,
  DocumentDefinition,
  DocumentHeader,
  ImageBlock,
} from '../../types';
import { Numero } from '@/shared/entities/numero.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { buildArretePreambleBlocks } from '../shared/arrete-preamble';

export type ArreteDeNumerotationNumeroParams = {
  baseLocale: BaseLocale;
  numero: Numero;
  voie: Voie;
  toponyme?: Toponyme;
  planDeSituation?: ImageBlock;
};

export function buildArreteDeNumerotationNumeroBlocks(
  params: ArreteDeNumerotationNumeroParams,
): DocumentBlock[] {
  const { numero, baseLocale, voie, toponyme, planDeSituation } = params;

  const blocks: DocumentBlock[] = [
    ...buildArretePreambleBlocks(baseLocale.communeNom),
    { type: 'newLine' },
    { type: 'fontSize', size: 20 },
    { type: 'text', text: 'ARRÊTÉ :', align: 'center' },
    { type: 'fontSize', size: 12 },
    { type: 'newLine' },
    {
      type: 'text',
      text: `Article 1 : Il est prescrit les numérotations suivantes (cf. plan ci-dessous) :`,
      align: 'justify',
    },
    {
      type: 'table',
      headers: ['Adresse complète', 'N° parcelle(s) cadastrale(s)'],
      rows: [
        [
          `${numero.numeroComplet} ${voie.nom}${
            toponyme ? `\n${toponyme.nom}` : ''
          }\n${baseLocale.communeNom}`,
          numero.parcelles.join(', ') || '-',
        ],
      ],
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

export function buildArreteDeNumerotationNumeroDefinition(
  header: DocumentHeader,
  params: ArreteDeNumerotationNumeroParams,
): DocumentDefinition {
  return {
    title: 'Arrêté de numérotation',
    header,
    blocks: buildArreteDeNumerotationNumeroBlocks(params),
  };
}
