const A_LOWER = 'a'.charCodeAt(0)
const A_UPPER = 'A'.charCodeAt(0)

function base62IntToChar(n) {
  if (!Number.isInteger(n) || n < 0 || n >= 62) {
    throw new Error('param must be an integer between 0 and 61')
  }

  if (n < 10) {
    return n.toString()
  }

  if (n < 36) {
    return String.fromCodePoint(n - 10 + A_LOWER)
  }

  return String.fromCodePoint(n - 36 + A_UPPER)
}

function base62IntToString(n) {
  if (!Number.isInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) {
    throw new Error('param must be a safe positive integer')
  }

  if (n === 0) {
    return '0'
  }

  let str = ''

  while (n > 0) {
    const mod = n % 62
    str = base62IntToChar(mod) + str
    n = n > mod ? (n - mod) / 62 : (n - mod)
  }

  return str
}

function generateBase62Part() {
  return base62IntToString(Number.parseInt(Math.random().toString().substr(2, 15), 10)).padStart(10, '0')
}

function generateBase62String(length = 10) {
  let result = ''

  while (result.length < length) {
    result += generateBase62Part().substr(2)
  }

  return result.slice(0, length)
}

module.exports = {base62IntToChar, base62IntToString, generateBase62Part, generateBase62String}
