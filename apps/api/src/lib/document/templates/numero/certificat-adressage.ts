import { DocumentBlock, DocumentDefinition, DocumentHeader } from '../../types';
import { Numero } from '@/shared/entities/numero.entity';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { GenerateCertificatDTO } from '@/modules/numeros/dto/generate_certificat.dto';

export type CertificatAdressageParams = {
  baseLocale: BaseLocale;
  numero: Numero;
  voie: Voie;
  toponyme?: Toponyme;
} & GenerateCertificatDTO;

export function buildCertificatAdressageBlocks(
  params: CertificatAdressageParams,
): DocumentBlock[] {
  const { numero, baseLocale, voie, toponyme, emetteur, destinataire } = params;

  return [
    {
      type: 'text',
      text: `${
        emetteur
          ? `Je, soussigné(e) ${emetteur}, atteste que `
          : `Le Maire de ${baseLocale.communeNom} atteste que `
      }${
        destinataire
          ? `la propriété appartenant à ${destinataire} désignée ci-dessous `
          : `l'adresse désignée ci-dessous `
      }est certifiée dans la Base Adresse Locale de ${baseLocale.communeNom}.`,
      align: 'left',
    },
    {
      type: 'table',
      headers: [
        'N° de voirie et désignation de la voie',
        'N° parcelle(s) cadastrale(s)',
      ],
      rows: [
        [
          `${numero.numeroComplet} ${voie.nom}${
            toponyme ? `\n${toponyme.nom}` : ''
          }\n${baseLocale.communeNom}`,
          numero.parcelles.join(', '),
        ],
      ],
    },
    { type: 'newLine' },
    { type: 'newLine' },
    {
      type: 'text',
      text: 'En foi de quoi, le présent certificat est délivré au demandeur pour servir et valoir ce que de droit.',
      align: 'left',
    },
    {
      type: 'text',
      text: "Il ne vaut pas : autorisation d'urbanisme, droit de passage, servitude, droit de propriété, certificat de résidence ou d'hébergement.",
      align: 'left',
    },
  ];
}

export function buildCertificatAdressageDefinition(
  header: DocumentHeader,
  params: CertificatAdressageParams,
): DocumentDefinition {
  return {
    title: "Certificat d'adressage",
    header,
    blocks: buildCertificatAdressageBlocks(params),
  };
}
