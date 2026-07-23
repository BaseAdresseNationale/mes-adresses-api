import { ApiProperty } from '@nestjs/swagger';
import { LineString, Point } from 'typeorm';
import { TypeNumerotationEnum } from './voie.entity';
import { PositionTypeEnum } from './position.entity';

// Shapes produced by the `apps/api/src/modules/event/serializers/*` for
// each entity type — kept next to the `Event` entity (rather than in
// `apps/api`) so it stays reachable from any app depending on this shared
// lib, without a reverse dependency from libs/shared onto apps/api.
//
// Declared as classes (not plain interfaces) so `@nestjs/swagger` can
// reflect on them via `@ApiProperty` and reference them from `Event`'s
// `payloadBefore`/`payloadAfter` `oneOf` schema — a plain TS interface has
// no runtime footprint and can't be introspected for Swagger generation.

export class SerializedVoie {
  @ApiProperty() id: string;
  @ApiProperty() banId: string;
  // ISO string, not Date: jsonb round-trips dates as strings, and this
  // shape must accurately describe the value once read back from DB.
  @ApiProperty() createdAt: string;
  @ApiProperty() balId: string;
  @ApiProperty() nom: string;
  @ApiProperty() nomAlt: Record<string, string> | null;
  @ApiProperty({ enum: TypeNumerotationEnum })
  typeNumerotation: TypeNumerotationEnum;
  @ApiProperty() centroid: Point | null;
  @ApiProperty() trace: LineString | null;
  @ApiProperty({ type: Number, isArray: true }) bbox: number[] | null;
  @ApiProperty() codeVoie: string | null;
  @ApiProperty() comment: string | null;
}

export class SerializedToponyme {
  @ApiProperty() id: string;
  @ApiProperty() banId: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() balId: string;
  @ApiProperty() nom: string;
  @ApiProperty() nomAlt: Record<string, string> | null;
  @ApiProperty() communeDeleguee: string | null;
  @ApiProperty({ type: String, isArray: true }) parcelles: string[] | null;
  @ApiProperty() codeVoie: string | null;
}

export class SerializedNumero {
  @ApiProperty() id: string;
  @ApiProperty() banId: string;
  @ApiProperty() createdAt: string;
  @ApiProperty() balId: string;
  @ApiProperty() voieId: string;
  @ApiProperty() toponymeId: string | null;
  @ApiProperty() numero: number;
  @ApiProperty() suffixe: string | null;
  @ApiProperty() comment: string | null;
  @ApiProperty({ type: String, isArray: true }) parcelles: string[] | null;
  @ApiProperty() certifie: boolean;
  @ApiProperty() communeDeleguee: string | null;
}

export class SerializedPosition {
  @ApiProperty() id: string;
  @ApiProperty() toponymeId: string | null;
  @ApiProperty() numeroId: string | null;
  @ApiProperty({ enum: PositionTypeEnum }) type: PositionTypeEnum;
  @ApiProperty() source: string | null;
  @ApiProperty() rank: number;
  @ApiProperty() point: Point;
}

// Payload of a simple (non-composite) CREATE/UPDATE/DELETE event.
export type EntityEventPayload =
  | SerializedVoie
  | SerializedToponyme
  | SerializedNumero
  | SerializedPosition;

export class ConvertVoieToToponymeBeforePayload {
  @ApiProperty({ type: () => SerializedVoie }) voie: SerializedVoie;
}

export class ConvertVoieToToponymeAfterPayload {
  @ApiProperty({ type: () => SerializedToponyme })
  toponyme: SerializedToponyme;
}

export class MergeVoiesBeforePayload {
  @ApiProperty({ type: () => SerializedVoie }) targetVoie: SerializedVoie;
  @ApiProperty({ type: () => SerializedVoie, isArray: true })
  sourceVoies: SerializedVoie[];
}

export class MergeVoiesAfterPayload {
  @ApiProperty({ type: () => SerializedVoie }) targetVoie: SerializedVoie;
  @ApiProperty({ type: String, isArray: true }) movedNumeroIds: string[];
}

// Payload of a composite (MERGE_VOIES / CONVERT_VOIE_TO_TOPONYME) event.
export type CompositeEventPayload =
  | ConvertVoieToToponymeBeforePayload
  | ConvertVoieToToponymeAfterPayload
  | MergeVoiesBeforePayload
  | MergeVoiesAfterPayload;

export type EventPayload = EntityEventPayload | CompositeEventPayload;

// All concrete payload classes — registered on `Event` via `@ApiExtraModels`
// so `getSchemaPath()` can reference them from the `oneOf` schema of
// `payloadBefore`/`payloadAfter`.
export const EVENT_PAYLOAD_MODELS = [
  SerializedVoie,
  SerializedToponyme,
  SerializedNumero,
  SerializedPosition,
  ConvertVoieToToponymeBeforePayload,
  ConvertVoieToToponymeAfterPayload,
  MergeVoiesBeforePayload,
  MergeVoiesAfterPayload,
] as const;
