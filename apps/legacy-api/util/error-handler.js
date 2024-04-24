const {ValidationError} = require('./payload')

function errorHandler(err, req, res, _next) {
  if (err) {
    if (err instanceof ValidationError) {
      const {message, validation} = err
      return res.status(400).send({code: 400, message, validation})
    }

    const statusCode = err.statusCode || 500
    const exposeError = statusCode !== 500

    res
      .status(statusCode)
      .send({
        code: statusCode,
        message: exposeError ? err.message : 'Une erreur inattendue est survenue.'
      })

    if (statusCode === 500) {
      console.error(err)
    }
  }
}

module.exports = errorHandler
