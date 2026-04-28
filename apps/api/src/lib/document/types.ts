export enum DocumentFormat {
  PDF = 'pdf',
  DOCX = 'docx',
}

export interface DocumentHeader {
  commune: { nom: string; code: string };
  communeLogo?: {
    dataUrl: string;
    metadata: { width: number; height: number };
  };
  adresseMairie?: string;
  date: string;
}

export interface TextBlock {
  type: 'text';
  text: string;
  align: 'left' | 'center' | 'right' | 'justify';
  useMaxWidth?: boolean;
}

export interface TableBlock {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface NewLineBlock {
  type: 'newLine';
}

export interface NewPageBlock {
  type: 'newPage';
}

export interface FontSizeBlock {
  type: 'fontSize';
  size: number;
}

export interface ImageBlock {
  type: 'image';
  dataUrl: string;
  format: 'png' | 'jpeg' | 'jpg';
  originalWidth: number;
  originalHeight: number;
}

export type DocumentBlock =
  | TextBlock
  | TableBlock
  | NewLineBlock
  | NewPageBlock
  | FontSizeBlock
  | ImageBlock;

export interface DocumentDefinition {
  title: string;
  header: DocumentHeader;
  blocks: DocumentBlock[];
}
