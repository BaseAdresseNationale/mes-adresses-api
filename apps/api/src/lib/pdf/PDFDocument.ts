import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TableOptions, TextOptions, PDFIndex } from './pdf.types';

export const xMargin = 20;
export const yMargin = 30;

export class PdfDocument {
  private doc: jsPDF;
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

    return this;
  }

  private resetXandY() {
    this.x = xMargin;
    this.y = yMargin;
  }

  private updatePointer() {
    this.doc.moveTo(this.x, this.y);
  }

  addNewPage() {
    this.doc.addPage();
    this.resetXandY();
    this.updatePointer();

    return this;
  }

  // Adds image at position (x, y) with width and height
  addImage(
    imageData: string,
    format: 'png' | 'jpeg' | 'jpg',
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ) {
    this.doc.addImage(
      imageData,
      format,
      options.x,
      options.y,
      options.width,
      options.height,
    );

    return this;
  }

  addGenericTable<T>(dataArr: T[], options: TableOptions) {
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
    this.y += (this.doc as any).lastAutoTable.finalY + this.doc.getLineHeight();
    this.updatePointer();

    return this;
  }

  addText(text: string, options?: TextOptions) {
    const lines = this.doc.splitTextToSize(
      text,
      this.doc.internal.pageSize.width - xMargin * 2,
    );

    const { x, y, addToIndex, ...restOptions } = options || {};

    if (addToIndex) {
      this.indexData.push({
        Index: text,
        Page: this.doc.getCurrentPageInfo().pageNumber,
      });
    }

    this.doc.text(lines, x || this.x, y || this.y, restOptions);
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

  render({ withIndex = false, withPageNumber = false }): ArrayBuffer {
    if (withPageNumber) {
      this.addPageNumbers();
    }
    if (withIndex) {
      this.addIndex();
    }

    return this.doc.output('arraybuffer');
  }

  private addPageNumbers() {
    const pageCount = (this.doc as any).internal.getNumberOfPages(); //Total Page Number
    for (let i = 0; i < pageCount; i++) {
      this.doc.setPage(i);
      const pageCurrent = (this.doc as any).internal.getCurrentPageInfo()
        .pageNumber; //Current Page
      this.doc.setFontSize(12);
      this.doc.text(
        'page: ' + pageCurrent + '/' + pageCount,
        xMargin,
        this.doc.internal.pageSize.height - yMargin / 2,
      );
    }
  }

  private addIndex() {
    this.doc.setPage(2);
    this.resetXandY();
    this.updatePointer();
    this.addGenericTable(this.indexData, {
      tableName: `Table of Contents`,
      theme: 'grid',
    });
  }
}
