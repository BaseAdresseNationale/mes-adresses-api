export async function getAdresseMairie(
  codeCommune: string,
): Promise<string | null> {
  const route = `${process.env.API_ETABLISSEMENTS_PUBLIC}/catalog/datasets/api-lannuaire-administration/records`;
  const query = `select=nom,adresse&where=code_insee_commune="${codeCommune}" and pivot LIKE "mairie"`;
  const url = `${route}?${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data?.results || data.results.length === 0) {
      return null;
    }

    const mainMarie = data.results.find(
      (result) => !result.nom.toLowerCase().includes('mairie déléguée'),
    );
    const mairieData = mainMarie || data.results[0];
    const adresseMairie = JSON.parse(mairieData.adresse)[0];
    return `${mairieData.nom}\n${adresseMairie.numero_voie}\n${adresseMairie.code_postal} ${adresseMairie.nom_commune}`;
  } catch (error) {
    // Optionally log the error here
    return null;
  }
}
