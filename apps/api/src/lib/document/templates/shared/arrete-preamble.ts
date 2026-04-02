import { DocumentBlock } from '../../types';

export function buildArretePreambleBlocks(communeNom: string): DocumentBlock[] {
  return [
    {
      type: 'text',
      text: `Le Maire de la commune de ${communeNom},`,
      align: 'left',
    },
    {
      type: 'text',
      text: `Vu le code général des collectivités territoriales et notamment son article L.2213-28,`,
      align: 'justify',
      useMaxWidth: true,
    },
    {
      type: 'text',
      text: `Vu l'article R.610-5 du code pénal qui prévoit que la violation des interdictions ou le manquement aux obligations édictées par les décrets et arrêtés de police sont punis de l'amende prévue pour les contraventions de la 1ere classe,`,
      align: 'justify',
      useMaxWidth: true,
    },
    {
      type: 'text',
      text: `Considérant que le numérotage des habitations en agglomération constitue une mesure de police générale que seul le Maire peut prescrire,`,
      align: 'justify',
      useMaxWidth: true,
    },
    {
      type: 'text',
      text: `Considérant que dans les communes où l'opération est nécessaire, le numérotage des maisons est exécuté pour la première fois à la charge de la commune,`,
      align: 'justify',
      useMaxWidth: true,
    },
  ];
}
