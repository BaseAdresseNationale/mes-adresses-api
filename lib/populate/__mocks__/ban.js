const {join} = require('path')
const nock = require('nock')

function mockBan54() {
  nock('https://adresse.data.gouv.fr')
    .get('/data/ban-v0/BAN_licence_gratuite_repartage_54.zip')
    .replyWithFile(200, join(__dirname, 'BAN_licence_gratuite_repartage_54.zip'))
}

module.exports = {mockBan54}
