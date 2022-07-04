const path = require('path')
const nock = require('nock')

function mockBan54084() {
  nock('https://plateforme.adresse.data.gouv.fr')
    .get('/ban/communes/54084/download/csv-bal/adresses')
    .replyWithFile(200, path.join(__dirname, 'adresses-54084.csv'))
}

module.exports = {mockBan54084}
