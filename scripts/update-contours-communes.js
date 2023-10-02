#!/usr/bin/env node
require('dotenv').config();
const { createContoursCommunesJson } = require('../legacy-api/util/contours-communes');

async function updateContoursCommune() {
  try {
    await createContoursCommunesJson();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

updateContoursCommune();
