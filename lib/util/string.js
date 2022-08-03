const {beautify} = require('@etalab/adresses-util/lib/voies')

function beautifyUppercased(str) {
  return str === str.toUpperCase()
    ? beautify(str)
    : str
}

function beautifyNomAlt(nomAlt) {
  if (nomAlt) {
    Object.keys(nomAlt).forEach(nom => {
      nomAlt[nom] = beautifyUppercased(nomAlt[nom])
    })

    return nomAlt
  }
}

module.exports = {beautifyUppercased, beautifyNomAlt}
