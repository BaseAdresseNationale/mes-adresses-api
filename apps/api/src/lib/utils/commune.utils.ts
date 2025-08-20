import * as cadastreCommune from '../../../../../cadastre-communes.json';
import * as communeOutreMerMapStyles from '../../../../../com-maps-styles.json';

const setCadastreCommune = new Set(cadastreCommune);

export function checkHasCadastre(communeCode: string): boolean {
  return setCadastreCommune.has(communeCode);
}

export function checkIsCommuneOutreMer(communeCode: string) {
  const prefix2 = communeCode.slice(0, 2);
  const prefix3 = communeCode.slice(0, 3);

  return (
    prefix2 > '97' ||
    (prefix2 === '97' && !['971', '972', '973', '974', '976'].includes(prefix3))
  );
}

export function getMapStyle(isCommuneOutreMer: boolean, compute) {
  if (!isCommuneOutreMer) {
    return true;
  }

  return compute();
}

function computeHasMapsStyle(codeCommune: string, mapStyle) {
  const codeCOM = codeCommune.slice(0, 3);

  return communeOutreMerMapStyles.find(({ code }) => code === codeCOM)[
    mapStyle
  ];
}

export function checkHasMapsStyles(
  codeCommune: string,
  isCommuneOutreMer: boolean,
): any {
  const mapsStyles = ['hasOpenMapTiles', 'hasOrtho', 'hasPlanIGN'];
  const hasMapsStyles = {};

  for (const mapStyle of mapsStyles) {
    Object.assign(hasMapsStyles, {
      [mapStyle]: getMapStyle(isCommuneOutreMer, () =>
        computeHasMapsStyle(codeCommune, mapStyle),
      ),
    });
  }

  return hasMapsStyles;
}
