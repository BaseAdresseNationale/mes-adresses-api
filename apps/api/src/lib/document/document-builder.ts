import { getCommuneFlagBase64PNG } from '../utils/commune-flag.utils';
import { getAdresseMairie } from '../utils/annuaire-service-public';
import { getImageDimensions } from '../utils/image.utils';
import { DocumentHeader, ImageBlock } from './types';

export async function prepareDocumentHeader(commune: {
  nom: string;
  code: string;
}): Promise<DocumentHeader> {
  const communeLogo = await getCommuneFlagBase64PNG(commune.code);
  const adresseMairie = await getAdresseMairie(commune.code);
  const date = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return { commune, communeLogo, adresseMairie, date };
}

export async function processImageFile(
  file: Express.Multer.File,
): Promise<ImageBlock> {
  const base64 = file.buffer.toString('base64');
  const format = file.mimetype.replace('image/', '');
  if (!['png', 'jpeg', 'jpg'].includes(format)) {
    throw new Error('Invalid file type. Only PNG and JPEG are allowed.');
  }
  const dataUrl = `data:image/${format};base64,${base64}`;
  const dimensions = await getImageDimensions(dataUrl);

  return {
    type: 'image',
    dataUrl,
    format: format as 'png' | 'jpeg' | 'jpg',
    originalWidth: dimensions.width,
    originalHeight: dimensions.height,
  };
}
