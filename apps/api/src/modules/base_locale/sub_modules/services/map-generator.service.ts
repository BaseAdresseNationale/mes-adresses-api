import { Injectable } from '@nestjs/common';
import { CustomMapGenerator } from '../../../../lib/map-generator/custom-map.generator';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Numero } from '@/shared/entities/numero.entity';
import puppeteer from 'puppeteer';

@Injectable()
export class MapGeneratorService {
  /**
   * Génère une carte A3 imprimable avec données intégrées
   */
  async generatePrintableMap(data: {
    baseLocale: BaseLocale;
    voies: Voie[];
    toponymes: Toponyme[];
    numeros: Numero[];
  }): Promise<Buffer> {
    // Générer l'image de fond de carte personnalisée
    const mapGenerator = new CustomMapGenerator({
      width: 3508, // A3 à 300 DPI
      height: 4961, // A3 à 300 DPI
      gridSize: 100,
      showGrid: true,
      backgroundColor: '#f9f9f9',
    });

    const mapImageBuffer = await mapGenerator.generateMap(data);
    const mapBase64 = mapImageBuffer.toString('base64');

    // Créer le HTML pour le PDF final avec la carte intégrée
    const htmlContent = this.generateMapHTML(mapBase64, data.baseLocale);

    // Générer le PDF avec Puppeteer
    return await this.generatePDF(htmlContent);
  }

  private generateMapHTML(mapBase64: string, baseLocale: BaseLocale): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { 
              size: A3 portrait; 
              margin: 15mm; 
            }
            
            body { 
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              width: 267mm; /* A3 width minus margins */
              height: 390mm; /* A3 height minus margins */
            }
            
            .map-header {
              text-align: center;
              padding: 10mm 0;
              border-bottom: 2px solid #333;
              margin-bottom: 5mm;
            }
            
            .map-title {
              font-size: 24px;
              font-weight: bold;
              color: #333;
              margin: 0;
            }
            
            .map-subtitle {
              font-size: 16px;
              color: #666;
              margin: 5px 0 0 0;
            }
            
            .map-container {
              position: relative;
              width: 100%;
              height: 320mm;
              border: 1px solid #333;
              overflow: hidden;
            }
            
            .map-image {
              width: 100%;
              height: 100%;
              object-fit: contain;
              background: #f9f9f9;
            }
            
            .map-footer {
              margin-top: 10mm;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 5mm;
              background: #f5f5f5;
              border: 1px solid #ddd;
            }
            
            .map-info {
              font-size: 12px;
              color: #666;
            }
            
            .scale-info {
              font-size: 10px;
              color: #999;
            }
            
            .north-arrow {
              position: absolute;
              top: 20px;
              left: 20px;
              width: 40px;
              height: 40px;
              background: rgba(255,255,255,0.9);
              border: 1px solid #333;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: bold;
              font-size: 20px;
            }
            
            .coordinate-grid {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
            }
            
            .grid-label {
              position: absolute;
              background: rgba(255,255,255,0.8);
              padding: 2px 4px;
              font-size: 10px;
              border: 1px solid #ccc;
            }
          </style>
        </head>
        <body>
          <div class="map-header">
            <h1 class="map-title">Plan de la commune de ${baseLocale.nom}</h1>
            <p class="map-subtitle">Carte des voies et numérotation - ${new Date().toLocaleDateString(
              'fr-FR',
            )}</p>
          </div>
          
          <div class="map-container">
            <img src="data:image/png;base64,${mapBase64}" alt="Carte de ${
              baseLocale.nom
            }" class="map-image">
            
            <div class="north-arrow">N</div>
            
            <!-- Grille de coordonnées optionnelle -->
            <div class="coordinate-grid">
              <div class="grid-label" style="top: 10px; left: 10px;">A1</div>
              <div class="grid-label" style="top: 10px; right: 10px;">A10</div>
              <div class="grid-label" style="bottom: 10px; left: 10px;">J1</div>
              <div class="grid-label" style="bottom: 10px; right: 10px;">J10</div>
            </div>
          </div>
          
          <div class="map-footer">
            <div class="map-info">
              <strong>Commune :</strong> ${baseLocale.nom}<br>
              <strong>Code INSEE :</strong> ${baseLocale.commune}<br>
              <strong>Dernière mise à jour :</strong> ${new Date().toLocaleDateString(
                'fr-FR',
              )}
            </div>
            <div class="scale-info">
              Échelle : 1/2500<br>
              Projection : RGF93 / Lambert-93<br>
              Format : A3 (297 × 420 mm)
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private async generatePDF(htmlContent: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      const pdfBuffer = await page.pdf({
        format: 'A3',
        printBackground: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm',
        },
        preferCSSPageSize: true,
      });

      return pdfBuffer as Buffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Génère une carte simplifiée pour aperçu
   */
  async generateMapPreview(data: {
    baseLocale: BaseLocale;
    voies: Voie[];
    toponymes: Toponyme[];
    numeros: Numero[];
  }): Promise<Buffer> {
    const mapGenerator = new CustomMapGenerator({
      width: 800,
      height: 600,
      gridSize: 50,
      showGrid: false,
      backgroundColor: '#ffffff',
    });

    return await mapGenerator.generateMap(data);
  }
}
