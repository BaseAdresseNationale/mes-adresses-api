async function getMairies(codeCommune: string): Promise<any> {
  const route = `${process.env.API_ETABLISSEMENTS_PUBLIC}/catalog/datasets/api-lannuaire-administration/records`;
  const query = `select=nom,adresse,adresse_courriel&where=code_insee_commune="${codeCommune}" and pivot LIKE "mairie"`;
  const url = `${route}?${query}`;

  const response = await fetch(url);
  const data = await response.json();
  return data;
}

function validateEmail(email: string) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[(?:\d{1,3}\.){3}\d{1,3}])|(([a-zA-Z\-\d]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

export async function getAdresseMairie(
  codeCommune: string,
): Promise<string | null> {
  try {
    const data = await getMairies(codeCommune);
    if (!data?.results || data.results.length === 0) {
      return null;
    }

    const mainMairie = data.results.find(
      (result) => !result.nom.toLowerCase().includes('mairie déléguée'),
    );
    const mairieData = mainMairie || data.results[0];
    const adresseMairie = JSON.parse(mairieData.adresse)[0];
    if (!adresseMairie) {
      return null;
    }

    return `${mairieData.nom}\n${adresseMairie.numero_voie}\n${adresseMairie.code_postal} ${adresseMairie.nom_commune}`;
  } catch (error) {
    console.log(
      'Could not fetch mairie address for commune : ',
      codeCommune,
      error,
    );
    return null;
  }
}

export async function getEmailsMairie(
  codeCommune: string,
): Promise<string[] | null> {
  try {
    const data = await getMairies(codeCommune);
    if (!data?.results || data.results.length === 0) {
      return null;
    }
    const mairies = data.results.filter(
      ({ adresse_courriel }) => adresse_courriel && adresse_courriel !== '',
    );

    if (mairies.length <= 0) {
      throw new Error('L’adresse email n’est pas trouvé');
    }

    const emails: string[] = [
      ...new Set<string>(
        mairies
          .reduce(
            (accumulator, { adresse_courriel }) => [
              ...accumulator,
              ...adresse_courriel.split(';'),
            ],
            [],
          )
          .filter((email) => validateEmail(email)),
      ),
    ];

    if (emails.length > 0) {
      return emails;
    }

    throw new Error(
      `Les adresses emails " ${emails.join(',')} " ne peut pas être utilisée`,
    );
  } catch (error) {
    console.log(
      'Could not fetch mairie mail for commune : ',
      codeCommune,
      error,
    );
    return [];
  }
}
