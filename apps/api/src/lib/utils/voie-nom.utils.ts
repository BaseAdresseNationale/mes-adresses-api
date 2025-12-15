import { trim } from 'lodash';
import { AlertCodeVoieEnum } from '../types/alerts.type';

const LIEU_WORD = 'lieu';
const DIT_WORD = 'dit';

const LIEU_DIT_WORDS = [`${LIEU_WORD}${DIT_WORD}`, `${LIEU_WORD}-${DIT_WORD}`];

const EXPAND_FIRST_WORD_TABLE = {
  pl: 'place',
  av: 'avenue',
  bd: 'boulevard',
  sq: 'square',
  che: 'chemin',
  chem: 'chemin',
  rte: 'route',
  all: 'allee',
  pas: 'passage',
  vla: 'villa',
  imp: 'impasse',
  qu: 'quai',
  ham: 'hammeau',
  prt: 'porte',
  parv: 'parvis',
  lot: 'lotissement',
  sen: 'sente',
  r: 'rue',
  rle: 'ruelle',
  car: 'carrefour',
  mte: 'montee',
  ptte: 'placette',
  str: 'sentier',
  tsse: 'terrasse',
  snt: 'sente',
};

const EXPAND_WORD_TABLE = {
  st: 'saint',
  ste: 'sainte',
  gal: 'general',
  mal: 'marechal',
};

const STOP_WORDS = [
  ...Object.keys(EXPAND_FIRST_WORD_TABLE),
  ...Object.keys(EXPAND_WORD_TABLE),
  'la',
  'le',
  'les',
  'l’',
  'los',
  'de',
  'des',
  'du',
  'd’',
  'par',
  'sur',
  'sous',
  'et',
  'au',
  'aux',
  'a',
  'à',
  'hui',
];

const ALWAYS_UPPER = [
  /* Acronymes */
  'za',
  'zac',
  'zi',
  'zad',
  /* Chiffres romains */
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
  'xi',
  'xii',
  'xiii',
  'xiv',
  'xv',
  'xvi',
  'xvii',
  'xviii',
  'xix',
  'xx',
  'xxi',
  'xxii',
  'xxiii',
  'xxiv',
  'xxv',
];

function capitalize(str: string): string {
  if (str.length === 0) {
    return '';
  }

  if (str.length === 1) {
    return str.toUpperCase();
  }

  return str[0].toUpperCase() + str.substring(1);
}

function eventuallyCapitalize(word: string): string {
  if (STOP_WORDS.includes(word)) {
    return word.toLowerCase();
  }

  if (ALWAYS_UPPER.includes(word)) {
    return word.toUpperCase();
  }
  return capitalize(word);
}

function fixCapitalize(words: string[]): string[] {
  return words.map((word) =>
    word
      .split('-')
      .map((w) => eventuallyCapitalize(w))
      .join('-'),
  );
}

function fixAbbreviation(words: string[]): string[] {
  return words.map((w, i) => {
    if (i !== 0) {
      if (Object.keys(EXPAND_WORD_TABLE).includes(w)) {
        return EXPAND_WORD_TABLE[w];
      }
      return w;
    }

    if (Object.keys(EXPAND_FIRST_WORD_TABLE).includes(w)) {
      return EXPAND_FIRST_WORD_TABLE[w];
    }

    return w;
  });
}

function fixWordLieuDit(words: string[]) {
  if (words.length < 2) {
    return words;
  } else if (LIEU_DIT_WORDS.includes(words[0])) {
    return words.slice(1);
  } else if (words[0] === LIEU_WORD && words[1] === DIT_WORD) {
    return words.slice(2);
  }

  return words;
}

function fixMultiWordRue(words: string[]) {
  if (words.length === 1) {
    return words;
  } else if (
    words[0] === 'rue' &&
    words.slice(1).some((w) => w.endsWith('rue'))
  ) {
    return words.slice(1);
  }

  return words;
}

function getWords(str: string, lowerCase: boolean = false): string[] {
  const strTrimmed = trim(str, " '-");

  const strBeautify = trim(
    strTrimmed
      // SUPPRIME LES CARACTERE INCONNUE
      .replace(/�/g, '')
      // SUPPRIME LES ESPACES SUCCESSIF
      .replace(/\s\s+/g, ' ')
      // SUPPRIME CE QUI EST ENTRE PARENTHESE
      .replace(/\([^()]*\)/g, '')
      // SUPPRIME LA PONCTUATION
      .replace(/[,/#!$%^&*;:{}=\~()"?«»…]/g, '')
      // RAJOUTE UN ESPACE DERRIERE LES '
      .replace(/('|’)\s*/g, '’ ')
      // SUPPRIME LE POINT A LA FIN
      .replace(/\.$/, ''),
  );

  const words = strBeautify.split(' ');

  if (lowerCase) {
    return words.map((w) => w.toLowerCase());
  }

  return words;
}

export function remediationVoieNom(str: string): string {
  let words: string[] = getWords(str, true);

  words = fixMultiWordRue(words);
  words = fixWordLieuDit(words);
  words = fixAbbreviation(words);
  words = fixCapitalize(words);
  return capitalize(
    words
      .join(' ')
      // ENLEVE L'ESPACE QU'ON AVAIT RAJOUTÉ DERRIERE LES '
      .replace(/’\s/g, '’'),
  );
}

function computeCommuneErrors(value: string): AlertCodeVoieEnum[] {
  const codes: AlertCodeVoieEnum[] = [];

  // SI CARACTERE INVALIDE
  if (value.match(/[�_,/#!$%^&*;:{}=\~"?«»…]/g)) {
    codes.push(AlertCodeVoieEnum.CARACTERE_INVALIDE);
  }
  // SI CELA COMMENCE PAR ESPACE ' ou -
  if (trim(value, " '-") !== value) {
    codes.push(AlertCodeVoieEnum.CARACTERE_INVALIDE_START);
  }
  // SI CELA FINI PAR UN POINT
  if (value.match(/\.$/)) {
    codes.push(AlertCodeVoieEnum.CARACTERE_INVALIDE_END);
  }
  // SI IL Y A UN MOT ENTRE PARENTHESE
  if (value.match(/\([^()]*\)/g)) {
    codes.push(AlertCodeVoieEnum.NO_WORDS_IN_PARENTHESES);
  }
  // SI PLUSIEURS ESPACE DE SUITE
  if (value.match(/\s\s+/g)) {
    codes.push(AlertCodeVoieEnum.MULTI_SPACE_CARACTERE);
  }

  return codes;
}

function computeSpecificWordsAndAbbreviationErrors(
  value: string,
): AlertCodeVoieEnum[] {
  const codes: AlertCodeVoieEnum[] = [];
  const lowerWords: string[] = getWords(value, true);
  // SI CELA COMMENCE PAR LIEU DIT
  if (
    lowerWords.length > 1 &&
    (LIEU_DIT_WORDS.includes(lowerWords[0]) ||
      (lowerWords[0] === LIEU_WORD && lowerWords[1] === DIT_WORD))
  ) {
    codes.push(AlertCodeVoieEnum.BAD_WORD_LIEUDIT);
  }
  // SI IL Y A PLUSIEURS FOIS LE MOT RUE
  if (
    lowerWords.length > 1 &&
    lowerWords[0] === 'rue' &&
    lowerWords.slice(1).some((w) => w.endsWith('rue'))
  ) {
    codes.push(AlertCodeVoieEnum.BAD_MULTI_WORD_RUE);
  }
  // SI IL Y A UNE ABREVATiON
  if (
    lowerWords.some(
      (w, i) =>
        (i !== 0 && Object.keys(EXPAND_WORD_TABLE).includes(w)) ||
        Object.keys(EXPAND_FIRST_WORD_TABLE).includes(w),
    )
  ) {
    codes.push(AlertCodeVoieEnum.ABBREVIATION_INVALID);
  }
  return codes;
}

function computeCasseIncorrecteErrors(value: string): AlertCodeVoieEnum[] {
  const words: string[] = getWords(value);
  const wordsCapitalized = fixCapitalize(words);
  if (words.length > 0 && words.some((w, i) => w !== wordsCapitalized[i])) {
    return [AlertCodeVoieEnum.CASSE_INCORRECTE];
  }

  return [];
}

export function computeVoieNomAlerts(
  value: string,
): [codes: AlertCodeVoieEnum[], remediation?: string] {
  const codes: AlertCodeVoieEnum[] = [];

  // SI CELA FAIT MOINS DE 3 OU PLUS QUE 200 CARACTERES
  if (value.length < 3) {
    return [[AlertCodeVoieEnum.TOO_SHORT]];
  } else if (value.length > 200) {
    return [[AlertCodeVoieEnum.TOO_LONG]];
  }

  const communeErrors = computeCommuneErrors(value);
  codes.push(...communeErrors);

  const specificWordsErrors = computeSpecificWordsAndAbbreviationErrors(value);
  codes.push(...specificWordsErrors);

  const casseIncorrecteErrors = computeCasseIncorrecteErrors(value);
  codes.push(...casseIncorrecteErrors);

  // CALCULER LA REMEDIATION SI IL Y A DES ERRORS
  let remediation: string | undefined;
  if (codes.length > 0) {
    remediation = remediationVoieNom(value);
  }

  return [codes, remediation];
}
