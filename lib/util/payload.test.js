const test = require('ava')
const Joi = require('joi')
const {getFilteredPayload} = require('./payload')

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
