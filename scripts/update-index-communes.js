#!/usr/bin/env node
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const got = require('got');
const Papa = require('papaparse');
const { groupBy, sortBy } = require('lodash');

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (res) => resolve(res),
      error: (err) => reject(err),
    });
  });
}

function selectCommune(communes) {
  if (communes.length === 1) {
    return communes[0];
  }
  const communesSorted = communes.sort((a, b) => {
    return (
      Number(b?.DATE_DEBUT?.split('-')[0]) -
      Number(a?.DATE_DEBUT?.split('-')[0])
    );
  });
  return communesSorted[1];
}

async function main() {
  const response = await got(
    'https://www.insee.fr/fr/statistiques/fichier/8377162/v_commune_depuis_1943.csv',
  );

  const csv = await parseCsv(response.body);

  const group = groupBy(csv.data, 'COM');
  const index = {};
  for (const [cog, communes] of Object.entries(group)) {
    index[cog] = selectCommune(communes)?.LIBELLE;
  }

  await writeFile(
    path.join(__dirname, '..', 'index-communes.json'),
    JSON.stringify(index, null, 2),
  );

  console.log('index-communes.json updated successfully !\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
