import * as sharp from 'sharp';

const BLASON_BUCKET_URL =
  'https://base-adresse-locale-prod-blasons-communes.s3.fr-par.scw.cloud';

export const getCommuneFlagUrl = async (
  codeCommune: string,
): Promise<string> => {
  if (!process.env.API_ANNUAIRE_DES_COLLECTIVITES) {
    return getCommuneFlagUrlFromBal(codeCommune);
  }

  const response = await fetch(
    `${process.env.API_ANNUAIRE_DES_COLLECTIVITES}/commune/logo/${codeCommune}`,
  );

  if (!response.ok) {
    return getCommuneFlagUrlFromBal(codeCommune);
  }

  const url = await response.text();

  return url;
};

export const getCommuneFlagUrlFromBal = async (
  codeCommune: string,
): Promise<string> => {
  const url = `${BLASON_BUCKET_URL}/${codeCommune}.svg`;

  const response = await fetch(url, {
    method: 'HEAD',
  });

  if (!response.ok) {
    return null;
  }

  return url;
};

type CommuneFlagBase64 = {
  dataUrl: string;
  metadata: sharp.Metadata;
};

export const getCommuneFlagBase64PNG = async (
  codeCommune: string,
): Promise<CommuneFlagBase64 | null> => {
  const communeFlagUrl = await getCommuneFlagUrl(codeCommune);
  if (!communeFlagUrl) {
    return null;
  }

  if (communeFlagUrl.startsWith('data:image/svg+xml;base64,')) {
    const base64Data = communeFlagUrl.replace('data:image/svg+xml;base64,', '');
    const svgBuffer = Buffer.from(base64Data, 'base64');
    const sharpImage = sharp(svgBuffer);
    const metadata = await sharpImage.metadata();
    const pngBuffer = await sharpImage.png().toBuffer();

    return {
      dataUrl: `data:image/png;base64,${pngBuffer.toString('base64')}`,
      metadata,
    };
  } else if (
    communeFlagUrl.startsWith('https://') ||
    communeFlagUrl.startsWith('http://')
  ) {
    const response = await fetch(communeFlagUrl);
    if (!response.ok) {
      return null;
    }
    const imageBuffer = await response.arrayBuffer();
    const sharpImage = sharp(imageBuffer);
    const metadata = await sharpImage.metadata();
    const pngBuffer = await sharpImage.png().toBuffer();

    return {
      dataUrl: `data:image/png;base64,${pngBuffer.toString('base64')}`,
      metadata,
    };
  } else {
    return null;
  }
};
