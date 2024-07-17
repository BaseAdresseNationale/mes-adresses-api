import { v4 as uuidv4 } from 'uuid';

export function ObjectIdToUuid(hexString: string): string | null {
  const buffer = Buffer.from(hexString, 'hex');
  const extendedBuffer = Buffer.concat([buffer, Buffer.alloc(4, 0)]);
  const uuid = uuidv4({
    random: Array.from(extendedBuffer),
  });
  return uuid;
}
