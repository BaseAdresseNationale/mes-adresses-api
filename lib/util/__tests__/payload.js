const test = require('ava')
const Joi = require('joi')
const {getFilteredPayload, validPayload, ValidationError} = require('../payload')

test('filter payload for create baselocal schema', t => {
  const schema = Joi.object().keys({
    foo: Joi.string()
  })
  const payload = {
    foo: 'bar',
    bar: 'bar'
  }

  const filteredPayload = getFilteredPayload(payload, schema)

  t.deepEqual(filteredPayload, {foo: 'bar'})
})

test('check a valid payload', t => {
  const schema = Joi.object().keys({
    foo: Joi.string()
  })
  const payload = {
    foo: 'foo'
  }

  t.notThrows(() => validPayload(payload, schema))
})

test('check a invalid payload', t => {
  const payload = {bar: '', toto: '1'}
  const schema = Joi.object().keys({
    foo: Joi.string().required(),
    bar: Joi.string().min(1),
    toto: Joi.number().required()
  })

  const error = t.throws(() => {
    validPayload(payload, schema)
  }, ValidationError)

  t.deepEqual(error.validation, {
    foo: ['"foo" is required'],
    bar: ['"bar" is not allowed to be empty', '"bar" length must be at least 1 characters long'],
    toto: ['"toto" must be a number']
  })
})
