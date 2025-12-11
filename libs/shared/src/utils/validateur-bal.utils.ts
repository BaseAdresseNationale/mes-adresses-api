import { getLabel, readValue } from '@ban-team/validateur-bal';

export async function getValidateurBalColumnErrors(
  label: string,
  value: string,
): Promise<{ errors: string[] }> {
  const data = await readValue(label, value);
  return {
    errors: data.errors.map((error) => getLabel(`${label}.${error}`)),
  };
}
