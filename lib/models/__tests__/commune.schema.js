const test = require('ava')
const {createSchema, updateSchema} = require('../commune')

test('valid payload', t => {
  const commune = {
    code: '27115'
  }

  const {error} = createSchema.validate(commune)

  t.is(error, undefined)
})

test('valid payload: demo', t => {
  const commune = {
    code: '27115',
    status: 'demo'
  }

  const {error} = createSchema.validate(commune)

  t.is(error, undefined)
})

test('invalid payload: invalid code commune', t => {
  const commune = {
    code: 'xxxxx'
  }

  const {error} = createSchema.validate(commune)

  t.is(error.message, '"code" contains an invalid value')
})

test('invalid payload: invalid status', t => {
  const commune = {
    code: '27115',
    status: 'invalid'
  }

  const {error} = createSchema.validate(commune)

  t.is(error.message, '"status" must be one of [demo, draft]')
})

test('valid payload: change status to draft', t => {
  const commune = {
    status: 'draft'
  }

  const {error} = updateSchema.validate(commune)

  t.is(error, undefined)
})

test('valid payload: change status to ready-to-publish', t => {
  const commune = {
    status: 'ready-to-publish'
  }

  const {error} = updateSchema.validate(commune)

  t.is(error, undefined)
})

test('invalid payload: change status to published', t => {
  const commune = {
    status: 'published'
  }

  const {error} = updateSchema.validate(commune)

  t.is(error, undefined)
})
