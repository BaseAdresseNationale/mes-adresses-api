const express = require('express')
const morgan = require('morgan')

const app = express()
const port = process.env.PORT || 5000

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'))
}

app.get('/', (req, res) => {
  res.send({message: 'Hello world!'})
})

app.listen(port)
