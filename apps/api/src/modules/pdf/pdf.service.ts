import { Injectable } from '@nestjs/common';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TableOptions, TextOptions, PDFIndex } from './pdf.types';

@Injectable()
export class PdfService {
  private doc: jsPDF;
  private readonly xMargin = 20;
  private readonly yMargin = 30;
  private indexData: PDFIndex[] = [];
  private x: number;
  private y: number;

  private defaultTableOptions: TableOptions = {
    tableName: 'default table name',
    ignoreFields: [],
    addToIndex: false,
  };

  constructor() {
    this.doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
    this.resetXandY();
    this.updatePointer();
  }

  private resetXandY() {
    this.x = this.xMargin;
    this.y = this.yMargin;
  }

  private updatePointer() {
    this.doc.moveTo(this.x, this.y);
  }

  async addNewPage() {
    this.doc.addPage();
    this.resetXandY();
    this.updatePointer();
  }

  // Adds image at position (x, y) with width and height
  async addImage(imageData: Uint8Array, options?: any) {
    this.doc.addImage(
      imageData,
      'JPEG',
      options?.x || this.x,
      options?.y || this.y,
      options?.width || this.doc.internal.pageSize.getWidth(),
      options?.height || this.doc.internal.pageSize.getHeight(),
    );

    this.y =
      options?.height ||
      this.doc.internal.pageSize.getHeight() + this.doc.getLineHeight();
    this.updatePointer();
  }

  async addGenericTable<T>(dataArr: T[], options: TableOptions) {
    if (dataArr.length === 0) {
      console.error('Data array is empty');
      return;
    }

    const mergedOptions: TableOptions = {
      ...this.defaultTableOptions,
      ...options,
      startY: this.y + this.doc.getLineHeight(),
    };

    this.addText(`${mergedOptions.tableName}`);

    if (mergedOptions.addToIndex) {
      this.indexData.push({
        Index: mergedOptions.tableName,
        Page: this.doc.getCurrentPageInfo().pageNumber,
      });
    }

    const headers = Object.keys(dataArr[0]).filter(
      (key) => !mergedOptions.ignoreFields?.includes(key),
    );

    const transformedData = dataArr.map((item: any) =>
      headers.map((key: string) =>
        item[key] instanceof Date ? item[key].toISOString() : item[key],
      ),
    );

    autoTable(this.doc, {
      head: [headers],
      body: transformedData,
      didDrawCell: () => {},
      ...mergedOptions,
    });
    this.y = (this.doc as any).lastAutoTable.finalY + this.doc.getLineHeight();
    this.updatePointer();
  }

  async addText(text: string, options?: TextOptions) {
    const lines = this.doc.splitTextToSize(
      text,
      this.doc.internal.pageSize.width - this.xMargin * 2,
    );

    if (options?.addToIndex) {
      this.indexData.push({
        Index: text,
        Page: this.doc.getCurrentPageInfo().pageNumber,
      });
    }

    this.doc.text(lines, options?.x || this.x, options?.y || this.y);
    this.y = this.doc.getTextDimensions(lines).h + this.doc.getLineHeight();
    this.updatePointer();
  }

  async addNewLine() {
    this.y += this.doc.getLineHeight();
    this.x = this.xMargin;
    this.updatePointer();
  }

  async render(): Promise<ArrayBuffer> {
    await this.addPageNumbers();
    await this.index();

    return this.doc.output('arraybuffer');
  }

  private async addPageNumbers() {
    const pageCount = (this.doc as any).internal.getNumberOfPages(); //Total Page Number
    for (let i = 0; i < pageCount; i++) {
      this.doc.setPage(i);
      const pageCurrent = (this.doc as any).internal.getCurrentPageInfo()
        .pageNumber; //Current Page
      this.doc.setFontSize(12);
      this.doc.text(
        'page: ' + pageCurrent + '/' + pageCount,
        this.xMargin,
        this.doc.internal.pageSize.height - this.yMargin / 2,
      );
    }
  }

  private async index() {
    this.doc.setPage(2);
    this.resetXandY();
    this.updatePointer();
    await this.addGenericTable(this.indexData, {
      tableName: `Table of Contents`,
      theme: 'grid',
    });
  }
}
