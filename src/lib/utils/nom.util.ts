export function cleanNom(nom: string) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ');
}

export function cleanNomAlt(nomAlt) {
  Object.keys(nomAlt).forEach((nom) => {
    nomAlt[nom] = cleanNom(nomAlt[nom]);
  });

  return nomAlt;
}
