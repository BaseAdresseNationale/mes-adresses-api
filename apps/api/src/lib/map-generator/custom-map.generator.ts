import { createCanvas, CanvasRenderingContext2D } from 'canvas';
import { BaseLocale } from '@/shared/entities/base_locale.entity';
import { Voie } from '@/shared/entities/voie.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Numero } from '@/shared/entities/numero.entity';

interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface MapOptions {
  width: number;
  height: number;
  gridSize: number;
  showGrid: boolean;
  backgroundColor: string;
}

export class CustomMapGenerator {
  private canvas: any;
  private ctx: CanvasRenderingContext2D;
  private bounds: MapBounds;
  private scale: { x: number; y: number };

  constructor(private options: MapOptions) {
    this.canvas = createCanvas(options.width, options.height);
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Génère une carte personnalisée avec les données de voies et toponymes
   */
  async generateMap(data: {
    baseLocale: BaseLocale;
    voies: Voie[];
    toponymes: Toponyme[];
    numeros: Numero[];
  }): Promise<Buffer> {
    const { voies, toponymes, numeros } = data;

    // 1. Calculer les limites géographiques
    this.calculateBounds(voies, numeros);

    // 2. Calculer l'échelle de projection
    this.calculateScale();

    // 3. Dessiner le fond
    this.drawBackground();

    // 4. Dessiner la grille si demandée
    if (this.options.showGrid) {
      this.drawGrid();
    }

    // 5. Dessiner les voies
    this.drawRoads(voies);

    // 6. Dessiner les toponymes (lieux-dits)
    this.drawToponymes(toponymes);

    // 7. Dessiner les numéros
    this.drawNumeros(numeros);

    // 8. Ajouter les labels des voies
    this.drawRoadLabels(voies);

    // 9. Ajouter la légende
    this.drawLegend();

    return this.canvas.toBuffer('image/png');
  }

  private calculateBounds(voies: Voie[], numeros: Numero[]) {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    // Analyser les géométries des voies
    voies.forEach((voie) => {
      if (voie.trace) {
        const coordinates = this.extractCoordinates(voie.trace);
        coordinates.forEach(([x, y]) => {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        });
      }
    });

    // Analyser les positions des numéros
    numeros.forEach((numero) => {
      if (numero.positions && numero.positions.length > 0) {
        numero.positions.forEach((position) => {
          if (position.point) {
            const coords = this.extractCoordinates(position.point);
            coords.forEach(([x, y]) => {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            });
          }
        });
      }
    });

    // Ajouter une marge
    const marginX = (maxX - minX) * 0.1;
    const marginY = (maxY - minY) * 0.1;

    this.bounds = {
      minX: minX - marginX,
      maxX: maxX + marginX,
      minY: minY - marginY,
      maxY: maxY + marginY,
    };
  }

  private calculateScale() {
    const mapWidth = this.bounds.maxX - this.bounds.minX;
    const mapHeight = this.bounds.maxY - this.bounds.minY;

    this.scale = {
      x: this.options.width / mapWidth,
      y: this.options.height / mapHeight,
    };
  }

  private projectPoint(x: number, y: number): [number, number] {
    const projectedX = (x - this.bounds.minX) * this.scale.x;
    const projectedY =
      this.options.height - (y - this.bounds.minY) * this.scale.y;
    return [projectedX, projectedY];
  }

  private drawBackground() {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.options.width, this.options.height);
  }

  private drawGrid() {
    const gridSize = this.options.gridSize;
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 0.5;
    this.ctx.setLineDash([2, 2]);

    // Lignes verticales
    for (let x = 0; x <= this.options.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.options.height);
      this.ctx.stroke();
    }

    // Lignes horizontales
    for (let y = 0; y <= this.options.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.options.width, y);
      this.ctx.stroke();
    }

    this.ctx.setLineDash([]);
  }

  private drawRoads(voies: Voie[]) {
    voies.forEach((voie) => {
      if (!voie.trace) return;

      const coordinates = this.extractCoordinates(voie.trace);
      if (coordinates.length < 2) return;

      // Style selon le type de voie
      const style = { color: '#777777', width: 2, dash: [] };
      this.ctx.strokeStyle = style.color;
      this.ctx.lineWidth = style.width;
      this.ctx.setLineDash(style.dash || []);

      this.ctx.beginPath();
      coordinates.forEach(([x, y], index) => {
        const [projX, projY] = this.projectPoint(x, y);
        if (index === 0) {
          this.ctx.moveTo(projX, projY);
        } else {
          this.ctx.lineTo(projX, projY);
        }
      });
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    });
  }

  private drawToponymes(toponymes: Toponyme[]) {
    toponymes.forEach((toponyme) => {
      if (!toponyme.positions || toponyme.positions.length === 0) return;

      const position = toponyme.positions[0];
      if (!position.point) return;

      const coords = this.extractCoordinates(position.point);
      if (coords.length === 0) return;

      const [x, y] = coords[0];
      const [projX, projY] = this.projectPoint(x, y);

      // Dessiner une zone pour le lieu-dit
      this.ctx.fillStyle = 'rgba(144, 238, 144, 0.3)';
      this.ctx.fillRect(projX - 20, projY - 20, 40, 40);

      // Dessiner le nom du toponyme
      this.ctx.fillStyle = '#2d5a2d';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(toponyme.nom, projX, projY + 4);
    });
  }

  private drawNumeros(numeros: Numero[]) {
    numeros.forEach((numero) => {
      if (!numero.positions || numero.positions.length === 0) return;

      numero.positions.forEach((position) => {
        if (!position.point) return;

        const coords = this.extractCoordinates(position.point);
        if (coords.length === 0) return;

        const [x, y] = coords[0];
        const [projX, projY] = this.projectPoint(x, y);

        // Dessiner le point du numéro
        this.ctx.fillStyle = '#ff4444';
        this.ctx.beginPath();
        this.ctx.arc(projX, projY, 4, 0, 2 * Math.PI);
        this.ctx.fill();

        // Dessiner le numéro
        this.ctx.fillStyle = '#000000';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(numero.numero.toString(), projX, projY - 8);
      });
    });
  }

  private drawRoadLabels(voies: Voie[]) {
    voies.forEach((voie) => {
      if (!voie.trace || !voie.nom) return;

      const coordinates = this.extractCoordinates(voie.trace);
      if (coordinates.length < 2) return;

      // Trouver le point milieu de la voie pour placer le label
      const midIndex = Math.floor(coordinates.length / 2);
      const [x, y] = coordinates[midIndex];
      const [projX, projY] = this.projectPoint(x, y);

      // Calculer l'angle de la route pour orienter le texte
      let angle = 0;
      if (midIndex > 0 && midIndex < coordinates.length - 1) {
        const [x1, y1] = this.projectPoint(...coordinates[midIndex - 1]);
        const [x2, y2] = this.projectPoint(...coordinates[midIndex + 1]);
        angle = Math.atan2(y2 - y1, x2 - x1);
      }

      this.ctx.save();
      this.ctx.translate(projX, projY);
      this.ctx.rotate(angle);
      this.ctx.fillStyle = '#000080';
      this.ctx.font = '11px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(voie.nom, 0, -5);
      this.ctx.restore();
    });
  }

  private drawLegend() {
    const legendX = this.options.width - 200;
    const legendY = 50;
    const legendWidth = 180;
    const legendHeight = 150;

    // Fond de la légende
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.fillRect(legendX, legendY, legendWidth, legendHeight);
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

    // Titre de la légende
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Légende', legendX + 10, legendY + 25);

    let currentY = legendY + 45;

    // Éléments de la légende
    const legendItems = [
      { color: '#333', width: 3, label: 'Routes principales' },
      { color: '#666', width: 2, label: 'Routes secondaires' },
      { color: '#ff4444', symbol: '●', label: 'Numéros' },
      { color: 'rgba(144, 238, 144, 0.5)', symbol: '■', label: 'Lieux-dits' },
    ];

    legendItems.forEach((item) => {
      if (item.width) {
        // Ligne pour les routes
        this.ctx.strokeStyle = item.color;
        this.ctx.lineWidth = item.width;
        this.ctx.beginPath();
        this.ctx.moveTo(legendX + 10, currentY);
        this.ctx.lineTo(legendX + 30, currentY);
        this.ctx.stroke();
      } else if (item.symbol) {
        // Symbole pour autres éléments
        this.ctx.fillStyle = item.color;
        this.ctx.font = '16px Arial';
        this.ctx.fillText(item.symbol, legendX + 10, currentY + 3);
      }

      // Texte
      this.ctx.fillStyle = '#333';
      this.ctx.font = '11px Arial';
      this.ctx.fillText(item.label, legendX + 40, currentY + 3);

      currentY += 25;
    });
  }

  private getRoadStyle(typeVoie?: string): {
    color: string;
    width: number;
    dash?: number[];
  } {
    switch (typeVoie?.toLowerCase()) {
      case 'avenue':
      case 'boulevard':
        return { color: '#333333', width: 4 };
      case 'rue':
        return { color: '#666666', width: 3 };
      case 'chemin':
      case 'sentier':
        return { color: '#999999', width: 2, dash: [5, 5] };
      case 'impasse':
        return { color: '#888888', width: 2 };
      default:
        return { color: '#777777', width: 2 };
    }
  }

  private extractCoordinates(geom: any): [number, number][] {
    // Adapter selon votre format de géométrie (GeoJSON, WKT, etc.)
    if (geom.type === 'LineString') {
      return geom.coordinates;
    } else if (geom.type === 'Point') {
      return [geom.coordinates];
    } else if (geom.coordinates && Array.isArray(geom.coordinates)) {
      return geom.coordinates;
    }
    return [];
  }
}
