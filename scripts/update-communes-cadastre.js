#!/usr/bin/env node
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const got = require('got');
const { flatten } = require('lodash');

async function main() {
  const json = await got(
    'https://cadastre.data.gouv.fr/data/etalab-cadastre-latest.json',
  ).json();

  const cadastreCommunes = flatten(
    json[0].contents
      .find((e) => e.name.endsWith('geojson'))
      .contents.find((e) => e.name.endsWith('communes'))
      .contents.map((e) => e.contents.map((e) => e.name)),
  ).map((e) => e.slice(-5));

  await writeFile(
    path.join(__dirname, '..', 'cadastre-communes.json'),
    JSON.stringify(cadastreCommunes, null, 2),
  );

  console.log('\ncadastre-communes.json updated successfully !\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
