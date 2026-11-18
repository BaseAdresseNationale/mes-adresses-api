import { isEqual } from 'lodash';

// Structural equality for serialized event payloads. A plain
// `JSON.stringify` comparison isn't safe here: one side is sometimes a
// value freshly built by a serializer (fixed key order), while the other
// comes back from a `jsonb` column — Postgres does not preserve object key
// order in `jsonb` storage, so two semantically identical payloads can
// stringify differently. `isEqual` compares structurally instead.
export function payloadsAreEqual(before: unknown, after: unknown): boolean {
  return isEqual(before, after);
}
