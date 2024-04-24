function getEditorUrlPattern() {
  if (process.env.EDITOR_URL_PATTERN) {
    return process.env.EDITOR_URL_PATTERN;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('EDITOR_URL_PATTERN must be defined in production mode');
  }

  return 'http://editor.domain.tld/<id>/<token>';
}

export function getApiUrl() {
  if (process.env.API_URL) {
    return process.env.API_URL;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('API_URL must be defined in production mode');
  }

  return 'http://api.domain.tld';
}

export function getEditorUrl(baseLocale) {
  return getEditorUrlPattern()
    .replace('<id>', baseLocale._id)
    .replace('<token>', baseLocale.token);
}

export function getApiRecoveryUrl(baseLocale) {
  return `${getApiUrl()}/v1/bases-locales/${baseLocale._id}/${
    baseLocale.token
  }/recovery`;
}
