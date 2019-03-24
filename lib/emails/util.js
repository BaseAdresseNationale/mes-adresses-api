function getEditorUrlPattern() {
  if (process.env.EDITOR_URL_PATTERN) {
    return process.env.EDITOR_URL_PATTERN
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('EDITOR_URL_PATTERN must be defined in production mode')
  }

  return 'http://editor.domain.tld/<id>/<token>'
}

const editorUrlPattern = getEditorUrlPattern()

function getEditorUrl(baseLocale) {
  return editorUrlPattern
    .replace('<id>', baseLocale._id)
    .replace('<token>', baseLocale.token)
}

module.exports = {getEditorUrl}
