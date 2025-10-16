import { jsPDF, TextOptionsLight } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { getAdresseMairie } from '../utils/annuaire-service-public';
import { getCommuneFlagBase64PNG } from '../utils/commune-flag.utils';
import { PDFAssetsManager } from './PDFAssetsManager';

export const xMargin = 20;
export const yMargin = 30;

export class PdfDocument {
  private doc: jsPDF;
  private x: number;
  private y: number;

  constructor() {
    this.doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    this.resetXandY();

    return this;
  }

  private resetXandY() {
    this.x = xMargin;
    this.y = yMargin;
  }

  private updatePointer() {
    this.doc.moveTo(this.x, this.y);
  }

  async initDocument(docTitle: string, commune: { nom: string; code: string }) {
    if (!PDFAssetsManager.isInitialized) {
      await PDFAssetsManager.init();
    }

    this.changeFont('Arial', PDFAssetsManager.getArialFont());
    /*     this.addImage(PDFAssetsManager.getRFLogo(), 'png', {
      width: 100,
      height: 100,
      x: xMargin,
      y: yMargin,
    }); */

    const communeLogo = await getCommuneFlagBase64PNG(commune.code);

    if (communeLogo) {
      this.addImage(communeLogo, 'png', {
        width: 50,
        height: 50,
        x: this.doc.internal.pageSize.width - xMargin * 2 - 50,
        y: yMargin + 25,
      });
    }

    const adresseMairie = await getAdresseMairie(commune.code);

    if (adresseMairie) {
      this.addNewLine()
        .addNewLine()
        .addNewLine()
        .addNewLine()
        .addNewLine()
        .addNewLine()
        .changeFontSize(12)
        .addText(adresseMairie, {
          align: 'right',
        });
    }

    return this.addNewLine()
      .addNewLine()
      .addText(
        `${commune.nom}, le ${new Date().toLocaleDateString('fr-Fr', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })}`,
        {
          align: 'right',
        },
      )
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .addNewLine()
      .changeFontSize(20)
      .addText(docTitle, {
        align: 'center',
      })
      .addNewLine()
      .changeFontSize(12);
  }

  getDocInstance() {
    return this.doc;
  }

  addNewPage() {
    this.doc.addPage();
    this.resetXandY();
    this.updatePointer();

    return this;
  }

  addImage(
    imageData: string,
    format: 'png' | 'jpeg' | 'jpg',
    options: {
      x?: number;
      y?: number;
      width: number;
      height: number;
    },
  ) {
    this.doc.addImage(
      imageData,
      format,
      options.x || this.x,
      options.y || this.y,
      options.width,
      options.height,
    );

    return this;
  }

  addGenericTable(headers: string[], body: string[][], options: UserOptions) {
    const mergedOptions: UserOptions = {
      ...options,
      startY: this.y + this.doc.getLineHeight(),
    };

    autoTable(this.doc, {
      head: [headers],
      body,
      didDrawCell: () => {},
      ...mergedOptions,
    });
    this.y = (this.doc as any).lastAutoTable.finalY + this.doc.getLineHeight();
    this.updatePointer();

    return this;
  }

  addText(text: string, options: TextOptionsLight) {
    const lines = this.doc.splitTextToSize(
      text,
      this.doc.internal.pageSize.width - xMargin * 2,
    );

    let horizontalOffset = xMargin;
    if (options.align === 'center') {
      horizontalOffset = this.doc.internal.pageSize.width / 2;
    } else if (options.align === 'right') {
      horizontalOffset = this.doc.internal.pageSize.width - xMargin;
    }

    this.doc.text(lines, horizontalOffset, this.y, options);
    this.y += this.doc.getTextDimensions(lines).h + this.doc.getLineHeight();
    this.updatePointer();

    return this;
  }

  changeFontSize(size: number) {
    this.doc.setFontSize(size);

    return this;
  }

  changeFont(fontName: string, fontData: string, fontStyle: string = 'normal') {
    this.doc.addFileToVFS(`${fontName}.ttf`, fontData);
    this.doc.addFont(`${fontName}.ttf`, fontName, fontStyle);
    this.doc.setFont(fontName);

    return this;
  }

  addNewLine() {
    this.y += this.doc.getLineHeight();
    this.x = xMargin;
    this.updatePointer();

    return this;
  }

  render(): string {
    return this.doc.output();
  }
}
