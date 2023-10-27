const mapsStyles = require('../com-maps-styles.json')

function checkIsCOM(communeCode) {
  const prefix2 = communeCode.slice(0, 2)
  const prefix3 = communeCode.slice(0, 3)

  return prefix2 > '97' || (prefix2 === '97' && !['971', '972', '973', '974', '976'].includes(prefix3))
}

function getMapStyle(isCOM, compute) {
  if (!isCOM) {
    return true
  }

  return compute()
}

function computeHasMapsStyle(codeCommune, mapStyle) {
  const codeCOM = codeCommune.slice(0, 3)

  return mapsStyles.find(({code}) => code === codeCOM)[mapStyle]
}

function checkHasMapsStyles(codeCommune, isCOM) {
  const mapsStyles = ['hasOpenMapTiles', 'hasOrtho', 'hasPlanIGN']
  const hasMapsStyles = {}

  for (const mapStyle of mapsStyles) {
    Object.assign(hasMapsStyles, {
      [mapStyle]: getMapStyle(isCOM, () => computeHasMapsStyle(codeCommune, mapStyle))}
    )
  }

  return hasMapsStyles
}

module.exports = {checkIsCOM, checkHasMapsStyles}
