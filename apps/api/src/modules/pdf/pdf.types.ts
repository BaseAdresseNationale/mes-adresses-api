import { TextOptionsLight } from 'jspdf';
import { UserOptions } from 'jspdf-autotable';

export interface PDFIndex {
  Index: string;
  Page: number;
}

export interface TableOptions extends UserOptions {
  ignoreFields?: string[];
  tableName: string;
  addToIndex?: boolean;
}

export interface TextOptions extends TextOptionsLight {
  x?: number;
  y?: number;
  addToIndex?: boolean;
}
