const path = require('path')
const nock = require('nock')

function mockBan54() {
  nock('https://adresse.data.gouv.fr')
    .get('/data/ban/adresses-odbl/latest/csv/adresses-54.csv.gz')
    .replyWithFile(200, path.join(__dirname, 'adresses-54.csv.gz'))
}

module.exports = {mockBan54}
