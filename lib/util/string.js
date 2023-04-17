const {mapValues} = require('lodash')
const {beautify} = require('@ban-team/adresses-util/lib/voies')

function beautifyUppercased(str) {
  return str === str.toUpperCase()
    ? beautify(str)
    : str
}

function beautifyNomAlt(nomAlt) {
  if (nomAlt) {
    return mapValues(nomAlt, nom => beautifyUppercased(nom))
  }
}

function cleanNom(nom) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ')
}

function diacriticSensitiveRegex(string = '') {
  return string.split('').join('\\s*')
     .replace(/a/g, '[a,á,à,ä,â]')
     .replace(/A/g, '[A,a,á,à,ä,â]')
     .replace(/e/g, '[e,é,ë,è]')
     .replace(/E/g, '[E,e,é,ë,è]')
     .replace(/i/g, '[i,í,ï,ì]')
     .replace(/I/g, '[I,i,í,ï,ì]')
     .replace(/o/g, '[o,ó,ö,ò]')
     .replace(/O/g, '[O,o,ó,ö,ò]')
     .replace(/u/g, '[u,ü,ú,ù]')
     .replace(/U/g, '[U,u,ü,ú,ù]')
     .replace(/ /g, '\\s*')
 }

module.exports = {beautifyUppercased, beautifyNomAlt, cleanNom, diacriticSensitiveRegex}
