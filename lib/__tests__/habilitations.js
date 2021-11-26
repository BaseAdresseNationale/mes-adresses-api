const test = require('ava')
const mongo = require('../util/mongo')

const {prepareHabilitation} = require('../habilitations')

test('prepare complete habilitation', t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  const habilitation = prepareHabilitation({
    _id,
    codeCommune: '27115',
    emailCommune: 'mairie@breux-sur-avre.fr',
    strategy: {
      pinCode: '1234',
      type: 'email',
      pinCodeExpiration: now,
      remainingAttempts: 10,
      createAt: now,
      validatedAt: now
    },
    client: {
      nom: 'Mes Adresses',
      organization: 'DINUM',
      email: 'iadresses@acme.ltd',
    },
    status: 'accepted',
    createdAt: now,
    updatedAt: now,
    expiresAt: now
  })

  t.deepEqual(habilitation, {
    _id,
    strategyType: 'email',
    emailCommune: 'mairie@breux-sur-avre.fr',
    status: 'accepted',
    createdAt: now,
    updatedAt: now,
    expiresAt: now
  })
})

test('prepare habilitation without strategy', t => {
  const _id = new mongo.ObjectID()
  const now = new Date()
  const habilitation = prepareHabilitation({
    _id,
    codeCommune: '27115',
    emailCommune: 'mairie@breux-sur-avre.fr',
    strategy: null,
    client: {
      nom: 'Mes Adresses',
      organization: 'DINUM',
      email: 'iadresses@acme.ltd',
    },
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt: now
  })

  t.deepEqual(habilitation, {
    _id,
    strategyType: null,
    emailCommune: 'mairie@breux-sur-avre.fr',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt: now
  })
})
