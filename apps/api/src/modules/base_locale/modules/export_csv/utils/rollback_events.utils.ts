import {
  Event,
  EventActionEnum,
  EventEntityTypeEnum,
} from '@/shared/entities/event.entity';
import {
  SerializedNumero,
  SerializedPosition,
  SerializedToponyme,
  SerializedVoie,
} from '@/shared/entities/event_payload.type';
import { Voie } from '@/shared/entities/voie.entity';
import { Numero } from '@/shared/entities/numero.entity';
import { Toponyme } from '@/shared/entities/toponyme.entity';
import { Position } from '@/shared/entities/position.entity';

interface BalSnapshot {
  voies: Voie[];
  toponymes: Toponyme[];
  numeros: Numero[];
}

// Groups events of a given entityType by entityId — at most one per id,
// guaranteed by the "at most one unsynced event per entity" invariant
// enforced by EventService.fuse().
function indexByEntityId(
  events: Event[],
  entityType: EventEntityTypeEnum,
): Map<string, Event> {
  const map = new Map<string, Event>();
  for (const event of events) {
    if (event.entityType === entityType && event.entityId) {
      map.set(event.entityId, event);
    }
  }
  return map;
}

function synthesizePosition(payload: SerializedPosition): Position {
  return {
    id: payload.id,
    toponymeId: payload.toponymeId,
    numeroId: payload.numeroId,
    type: payload.type,
    source: payload.source,
    rank: payload.rank,
    point: payload.point,
  };
}

// Rolls back the positions of a single numero/toponyme: patches/removes
// still-live positions per their own ignored event, then re-adds any
// position whose ignored DELETE event belonged to this owner — which also
// naturally reconstructs *every* position of an owner that was itself
// synthesized from an ignored DELETE (its positions were cascade-deleted,
// and cascade-ignored, together with it).
function rollbackPositions(
  livePositions: Position[],
  ownerId: string,
  ownerKey: 'numeroId' | 'toponymeId',
  positionEvents: Event[],
): Position[] {
  const eventByPositionId = new Map(
    positionEvents.map((event) => [event.entityId, event]),
  );

  const kept = livePositions.filter((position) => {
    const event = eventByPositionId.get(position.id);
    if (!event) {
      return true;
    }
    if (event.action === EventActionEnum.CREATE) {
      return false;
    }
    if (event.action === EventActionEnum.UPDATE) {
      const before = event.payloadBefore as SerializedPosition;
      position.point = before.point;
      position.type = before.type;
      position.source = before.source;
    }
    return true;
  });

  const reconstructed = positionEvents
    .filter((event) => event.action === EventActionEnum.DELETE)
    .map((event) => event.payloadBefore as SerializedPosition)
    .filter((before) => before[ownerKey] === ownerId)
    .map((before) => synthesizePosition(before));

  return [...kept, ...reconstructed];
}

// Rebuilds the {voies, toponymes, numeros} snapshot as if `ignoredEvents`
// had never happened, so it can be fed to the existing CSV renderer
// unchanged. `ignoredEvents` is expected to already include the full
// descendant subtree of whatever the caller wanted to ignore (resolved
// upstream, in apps/api, by EventService.findEventsWithDescendants) — this
// function has no notion of parent/child, it only applies each event's own
// rollback to its own entity.
export function applyEventsRollback(
  { voies, toponymes, numeros }: BalSnapshot,
  ignoredEvents: Event[],
): BalSnapshot {
  if (ignoredEvents.length === 0) {
    return { voies, toponymes, numeros };
  }

  const voieEvents = indexByEntityId(ignoredEvents, EventEntityTypeEnum.VOIE);
  const toponymeEvents = indexByEntityId(
    ignoredEvents,
    EventEntityTypeEnum.TOPONYME,
  );
  const numeroEvents = indexByEntityId(
    ignoredEvents,
    EventEntityTypeEnum.NUMERO,
  );
  const positionEvents = ignoredEvents.filter(
    (event) => event.entityType === EventEntityTypeEnum.POSITION,
  );

  const rolledBackVoies: Voie[] = [];
  for (const voie of voies) {
    const event = voieEvents.get(voie.id);
    if (!event) {
      rolledBackVoies.push(voie);
      continue;
    }
    if (event.action === EventActionEnum.CREATE) {
      continue;
    }
    const before = event.payloadBefore as SerializedVoie;
    rolledBackVoies.push({
      ...voie,
      nom: before.nom,
      nomAlt: before.nomAlt,
      codeVoie: before.codeVoie,
      comment: before.comment,
      banId: before.banId,
    });
  }
  for (const event of voieEvents.values()) {
    if (event.action !== EventActionEnum.DELETE) {
      continue;
    }
    const before = event.payloadBefore as SerializedVoie;
    rolledBackVoies.push({
      id: before.id,
      banId: before.banId,
      balId: before.balId,
      createdAt: new Date(before.createdAt),
      updatedAt: new Date(before.createdAt),
      nom: before.nom,
      nomAlt: before.nomAlt,
      typeNumerotation: before.typeNumerotation,
      centroid: before.centroid,
      trace: before.trace,
      bbox: before.bbox,
      codeVoie: before.codeVoie,
      comment: before.comment,
    } as Voie);
  }

  const rolledBackToponymes: Toponyme[] = [];
  for (const toponyme of toponymes) {
    const event = toponymeEvents.get(toponyme.id);
    if (!event) {
      rolledBackToponymes.push(toponyme);
      continue;
    }
    if (event.action === EventActionEnum.CREATE) {
      continue;
    }
    const before = event.payloadBefore as SerializedToponyme;
    rolledBackToponymes.push({
      ...toponyme,
      nom: before.nom,
      nomAlt: before.nomAlt,
      communeDeleguee: before.communeDeleguee,
      parcelles: before.parcelles,
      codeVoie: before.codeVoie,
      banId: before.banId,
    });
  }
  for (const event of toponymeEvents.values()) {
    if (event.action !== EventActionEnum.DELETE) {
      continue;
    }
    const before = event.payloadBefore as SerializedToponyme;
    rolledBackToponymes.push({
      id: before.id,
      banId: before.banId,
      balId: before.balId,
      createdAt: new Date(before.createdAt),
      updatedAt: new Date(before.createdAt),
      nom: before.nom,
      nomAlt: before.nomAlt,
      communeDeleguee: before.communeDeleguee,
      parcelles: before.parcelles,
      codeVoie: before.codeVoie,
      positions: [],
    } as Toponyme);
  }

  const rolledBackNumeros: Numero[] = [];
  for (const numero of numeros) {
    const event = numeroEvents.get(numero.id);
    if (!event) {
      rolledBackNumeros.push(numero);
      continue;
    }
    if (event.action === EventActionEnum.CREATE) {
      continue;
    }
    const before = event.payloadBefore as SerializedNumero;
    rolledBackNumeros.push({
      ...numero,
      numero: before.numero,
      suffixe: before.suffixe,
      comment: before.comment,
      parcelles: before.parcelles,
      certifie: before.certifie,
      communeDeleguee: before.communeDeleguee,
      voieId: before.voieId,
      banId: before.banId,
    });
  }
  for (const event of numeroEvents.values()) {
    if (event.action !== EventActionEnum.DELETE) {
      continue;
    }
    const before = event.payloadBefore as SerializedNumero;
    rolledBackNumeros.push({
      id: before.id,
      banId: before.banId,
      balId: before.balId,
      createdAt: new Date(before.createdAt),
      updatedAt: new Date(before.createdAt),
      voieId: before.voieId,
      // A deleted numero's toponyme (if any) is only known through the
      // paired TOPONYME junction event — restored below if that event was
      // also ignored (see the "Limites" note: both must be ignored
      // together for a fully consistent rollback).
      toponymeId: null,
      numero: before.numero,
      suffixe: before.suffixe,
      comment: before.comment,
      parcelles: before.parcelles,
      certifie: before.certifie,
      communeDeleguee: before.communeDeleguee,
      positions: [],
    } as Numero);
  }

  for (const numero of rolledBackNumeros) {
    numero.positions = rollbackPositions(
      numero.positions ?? [],
      numero.id,
      'numeroId',
      positionEvents,
    );
  }
  for (const toponyme of rolledBackToponymes) {
    toponyme.positions = rollbackPositions(
      toponyme.positions ?? [],
      toponyme.id,
      'toponymeId',
      positionEvents,
    );
  }

  // Numero <-> toponyme junction rollback: an ignored TOPONYME UPDATE event
  // carries the pre-change `numeroIds` in its `payloadBefore` — numeros
  // present only in `after` must be detached, numeros present only in
  // `before` must be re-attached.
  const numeroById = new Map(rolledBackNumeros.map((n) => [n.id, n]));
  for (const event of toponymeEvents.values()) {
    if (event.action !== EventActionEnum.UPDATE) {
      continue;
    }
    const before = event.payloadBefore as SerializedToponyme;
    const after = event.payloadAfter as SerializedToponyme | null;
    const beforeIds = new Set(before?.numeroIds ?? []);
    const afterIds = new Set(after?.numeroIds ?? []);
    for (const numeroId of afterIds) {
      if (!beforeIds.has(numeroId)) {
        const numero = numeroById.get(numeroId);
        if (numero) {
          numero.toponymeId = null;
        }
      }
    }
    for (const numeroId of beforeIds) {
      if (!afterIds.has(numeroId)) {
        const numero = numeroById.get(numeroId);
        if (numero) {
          numero.toponymeId = event.entityId;
        }
      }
    }
  }

  return {
    voies: rolledBackVoies,
    toponymes: rolledBackToponymes,
    numeros: rolledBackNumeros,
  };
}
