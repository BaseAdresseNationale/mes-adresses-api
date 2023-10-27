const {compareDesc, parse, isValid} = require('date-fns')

function isValidDate(date) {
  const dateObj = parse(date, 'yyyy-MM-dd', new Date())
  return isValid(dateObj)
}

function checkFromIsBeforeTo(from, to) {
  const dateFrom = new Date(from)
  const dateTo = new Date(to)
  return compareDesc(dateFrom, dateTo) >= 0
}

module.exports = {isValidDate, checkFromIsBeforeTo}
