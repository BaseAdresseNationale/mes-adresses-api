const test = require('ava')
const {getFilteredPayload, validPayload, ValidationError, addError} = require('../payload')

test('filter payload for create baselocal schema', t => {
  const schema = {
    foo: {valid: null, isRequired: false, nullAllowed: false, type: 'string'}
  }
  const payload = {
    foo: 'bar',
    bar: 'bar'
  }

  const filteredPayload = getFilteredPayload(payload, schema)

  t.deepEqual(filteredPayload, {foo: 'bar'})
})

test('check a valid payload', async t => {
  const schema = {
    foo: {valid: null, isRequired: false, nullAllowed: false, type: 'string'}
  }
  const payload = {
    foo: 'foo'
  }

  await t.notThrowsAsync(validPayload(payload, schema))
})

test('check a invalid payload', async t => {
  const payload = {bar: '', toto: '1'}
  const schema = {
    foo: {valid: null, isRequired: true, nullAllowed: false, type: 'string'},
    bar: {valid(p, err) {
      if (p.length === 0) {
        addError(err, 'bar', 'Le champ est trop court (1 caractère minimum)')
      }
    }, isRequired: false, nullAllowed: false, type: 'string'},
    toto: {valid: null, isRequired: true, nullAllowed: false, type: 'number'}
  }

  const error = await t.throwsAsync(validPayload(payload, schema), {instanceOf: ValidationError})

  t.deepEqual(error.validation, {
    foo: ['Le champ foo est obligatoire'],
    bar: ['Le champ est trop court (1 caractère minimum)'],
    toto: ['Le champ toto doit être de type "number"']
  })
})
