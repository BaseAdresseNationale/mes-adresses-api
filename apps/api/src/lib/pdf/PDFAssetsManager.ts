import * as path from 'path';
import * as fs from 'node:fs/promises';

export class PDFAssetsManager {
  private static arialFontBase64: string;
  private static rfLogoBase64: string;
  public static isInitialized = false;

  static async init() {
    try {
      // Load Arial font
      const fontPath = path.join(process.cwd(), 'public/fonts/ARIAL.TTF');
      const fontBuffer = await fs.readFile(fontPath);
      this.arialFontBase64 = fontBuffer.toString('base64');

      // Load République Française logo
      const logoRFPath = path.join(process.cwd(), 'public/images/logo-rf.png');
      const logoRF = await fs.readFile(logoRFPath);
      this.rfLogoBase64 = logoRF.toString('base64');

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing PDFAssetsManager:', error);
      throw error;
    }
  }

  static getArialFont(): string {
    return this.arialFontBase64;
  }

  static getRFLogo(): string {
    return `data:image/png;base64,${this.rfLogoBase64}`;
  }
}
