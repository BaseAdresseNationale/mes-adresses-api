#!/usr/bin/env node
const { writeFile } = require('node:fs/promises');
const path = require('node:path');
const got = require('got');
const { parseISO } = require('date-fns');
const { keyBy } = require('lodash');
const communes = require('@etalab/decoupage-administratif/data/communes.json');

const minDate = new Date('2010-01-01');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const getCommunesPrecedents = async (codeCommune, date) => {
  const url = `https://api.insee.fr/metadonnees/geo/commune/${codeCommune}/precedents${
    date ? `?date=${date}` : ''
  }`;
  const response = await got(url, {
    headers: {
      accept: 'application/json',
    },
  });
  const body = response.body;
  const data = JSON.parse(body);
  return data;
};

const setCommunesPrecedents = async (
  codeCommune,
  nomCommune,
  data,
  communesJson,
) => {
  const res = keyBy(data, 'code');
  const anciennesCommunes = Object.values(res)
    .filter(({ dateSuppression }) => parseISO(dateSuppression) > minDate)
    .map(({ code, intitule }) => ({
      code,
      nom: intitule,
    }));

  if (anciennesCommunes.length > 0) {
    communesJson.push({
      code: codeCommune,
      nom: nomCommune,
      anciennesCommunes,
    });
  }
};

async function fetchCommmunePrecedentsRecur(codeCommune, date = null) {
  const data = await getCommunesPrecedents(codeCommune, date);
  const commune = data.find((c) => c.code === codeCommune);
  const dateCreation = parseISO(commune.dateCreation);
  if (dateCreation > minDate) {
    const dataDeep = await fetchCommmunePrecedentsRecur(
      codeCommune,
      commune.dateCreation,
    );
    return [...data, ...dataDeep];
  }
  return data;
}

async function main() {
  let communesNouvelles = communes.filter(
    (c) => c.type == 'commune-actuelle' && c.anciensCodes?.length > 0,
  );

  const communesJson = [];
  let index = 0;

  for (const c of communesNouvelles) {
    try {
      const data = await fetchCommmunePrecedentsRecur(c.code);
      setCommunesPrecedents(c.code, c.nom, data, communesJson);
      await sleep(1000);
      index++;
      console.log(`${index}/${communesNouvelles.length}`);
    } catch (e) {
      console.log(`ERROR pour la commune ${c.code}`, e);
    }
  }

  await writeFile(
    path.join(__dirname, '..', 'communes-precedentes-by-chef-lieu.json'),
    JSON.stringify(communesJson, null, 2),
  );

  console.log('communes-nouvelles.json updated successfully !\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
