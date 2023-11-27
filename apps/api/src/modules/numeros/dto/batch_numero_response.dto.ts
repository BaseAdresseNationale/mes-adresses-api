import { ApiProperty } from '@nestjs/swagger';
import { UpdateBatchNumeroChangeDTO } from './update_batch_numero_change.dto';

export class BatchNumeroResponseDTO {
  @ApiProperty({ type: String, required: true, nullable: true })
  modifiedCount?: number;

  @ApiProperty({
    type: () => UpdateBatchNumeroChangeDTO,
    required: false,
    nullable: true,
  })
  changes?: UpdateBatchNumeroChangeDTO;
}
