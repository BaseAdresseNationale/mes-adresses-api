const test = require('ava')

const {prepareHabilitation} = require('../habilitations')

test('prepare complete habilitation', t => {
  const now = new Date()
  const habilitation = prepareHabilitation({
    _id: 'xxxxxx',
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
    _id: 'xxxxxx',
    strategyType: 'email',
    emailCommune: 'mairie@breux-sur-avre.fr',
    status: 'accepted',
    createdAt: now,
    updatedAt: now,
    expiresAt: now
  })
})

test('prepare habilitation without strategy', t => {
  const now = new Date()
  const habilitation = prepareHabilitation({
    _id: 'xxxxxx',
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
    _id: 'xxxxxx',
    strategyType: null,
    emailCommune: 'mairie@breux-sur-avre.fr',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    expiresAt: now
  })
})
