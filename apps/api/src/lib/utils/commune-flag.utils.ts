import * as sharp from 'sharp';

export const getCommuneFlagSVG = async (
  codeCommune: string,
): Promise<string> => {
  const url = `https://base-adresse-locale-prod-blasons-communes.s3.fr-par.scw.cloud/${codeCommune}.svg`;

  const response = await fetch(url, {
    method: 'GET',
  });

  return response.text();
};

export const getCommuneFlagBase64PNG = async (
  codeCommune: string,
): Promise<string> => {
  const communeLogoSvgString = await getCommuneFlagSVG(codeCommune);
  const svgBuffer = Buffer.from(communeLogoSvgString, 'utf-8');
  const pngBuffer = await sharp(svgBuffer).png().toBuffer();
  const communeLogo = `data:image/png;base64,${pngBuffer.toString('base64')}`;

  return communeLogo;
};
