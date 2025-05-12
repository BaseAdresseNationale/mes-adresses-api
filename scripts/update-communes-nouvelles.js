#!/usr/bin/env node
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const got = require('got');
const { parseISO } = require('date-fns');
const communes = require('@etalab/decoupage-administratif/data/communes.json');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main() {
  let communesNouvelles = communes.filter(
    (c) => c.type == 'commune-actuelle' && c.anciensCodes?.length > 0,
  );
  const minDate = new Date('2010-01-01');
  const communesJson = [];
  let index = 0;

  for (const c of communesNouvelles) {
    try {
      const url = `https://api.insee.fr/metadonnees/geo/commune/${c.code}/precedents`;
      const response = await got(url, {
        headers: {
          accept: 'application/json',
        },
      });
      const body = response.body;
      const data = JSON.parse(body);
      const anciennesCommunes = data
        .filter(({ dateSuppression }) => parseISO(dateSuppression) > minDate)
        .map(({ code, intitule }) => ({
          code,
          nom: intitule,
        }));

      if (anciennesCommunes.length > 0) {
        communesJson.push({
          code: c.code,
          nom: c.nom,
          anciennesCommunes,
        });
      }
      await sleep(1000);
      index++;
      console.log(`${index}/${communesNouvelles.length}`);
    } catch (e) {
      console.log(`ERROR pour le commune ${c.code}`, e);
    }
  }

  await writeFile(
    path.join(__dirname, '..', 'communes-nouvelles.json'),
    JSON.stringify(communesJson, null, 2),
  );

  console.log('communes-nouvelles.json updated successfully !\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
