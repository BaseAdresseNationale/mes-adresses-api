#!/usr/bin/env node
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const got = require('got');
const communes = require('@etalab/decoupage-administratif/data/communes.json');

async function main() {
  let communesNouvelles = communes.filter(
    (c) => c.type == 'commune-actuelle' && c.anciensCodes?.length > 0,
  );

  const results = await Promise.all(
    communesNouvelles.map(async (c) => {
      const url = `https://api.insee.fr/metadonnees/geo/commune/${c.code}/precedents`;
      const response = await got(url, {
        headers: {
          accept: 'application/json',
        },
      });
      const body = response.body;
      const data = JSON.parse(body);
      return {
        code: c.code,
        nom: c.nom,
        anciennesCommunes: data.map(({ code, intitule }) => ({
          code,
          nom: intitule,
        })),
      };
    }),
  );

  await writeFile(
    path.join(__dirname, '..', 'communes-nouvelles.json'),
    JSON.stringify(results, null, 2),
  );

  console.log('communes-nouvelles.json updated successfully !\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
