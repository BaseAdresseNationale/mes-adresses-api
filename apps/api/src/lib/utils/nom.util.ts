export function cleanNom(nom: string) {
  return nom.replace(/^\s+/g, '').replace(/\s+$/g, '').replace(/\s\s+/g, ' ');
}

export function cleanNomAlt(nomAlt) {
  Object.keys(nomAlt).forEach((nom) => {
    nomAlt[nom] = cleanNom(nomAlt[nom]);
  });

  return nomAlt;
}

export function getNomAltDefault(nomAlt) {
  return nomAlt && Object.keys(nomAlt).length > 0 ? nomAlt : null;
}
