import { ApiProperty } from '@nestjs/swagger';
import { UpdateBatchNumeroChangeDTO } from './update_batch_numero_change.dto';

export class BatchNumeroResponseDTO {
  @ApiProperty({ type: Number, required: true })
  modifiedCount?: number;

  @ApiProperty({
    type: () => UpdateBatchNumeroChangeDTO,
    required: false,
  })
  changes?: UpdateBatchNumeroChangeDTO;
}
