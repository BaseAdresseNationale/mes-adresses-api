import * as Canvas from 'canvas';

export const getImageDimensions = (
  imageDataUrl: string,
): Promise<{
  width: number;
  height: number;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Canvas.Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = imageDataUrl;
  });
};
