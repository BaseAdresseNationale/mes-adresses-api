import * as sharp from 'sharp';

export const getCommuneFlagSVG = async (
  codeCommune: string,
): Promise<string> => {
  const url = `https://base-adresse-locale-prod-blasons-communes.s3.fr-par.scw.cloud/${codeCommune}.svg`;

  try {
    const response = await fetch(url, {
      method: 'GET',
    });
    if (!response.ok) {
      return '';
    }

    return await response.text();
  } catch (error) {
    return '';
  }
};

export const getCommuneFlagBase64PNG = async (
  codeCommune: string,
): Promise<string | null> => {
  const communeLogoSvgString = await getCommuneFlagSVG(codeCommune);
  if (!communeLogoSvgString) {
    return null;
  }

  // Convert SVG string to PNG buffer using sharp
  const svgBuffer = Buffer.from(communeLogoSvgString, 'utf-8');
  const pngBuffer = await sharp(svgBuffer).png().toBuffer();
  const communeLogo = `data:image/png;base64,${pngBuffer.toString('base64')}`;

  return communeLogo;
};
