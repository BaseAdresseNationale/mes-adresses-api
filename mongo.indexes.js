module.exports = {
  communes: [
    {_bal: 1},
    {_bal: 1, code: 1}
  ],

  voies: [
    {_bal: 1},
    {_bal: 1, commune: 1}
  ],

  numeros: [
    {_bal: 1},
    {_bal: 1, commune: 1},
    {voie: 1}
  ]
}
