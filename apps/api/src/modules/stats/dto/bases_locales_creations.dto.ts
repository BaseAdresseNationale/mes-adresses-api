import { ApiProperty } from '@nestjs/swagger';

export class BasesLocalesCreationDTO {
  @ApiProperty()
  date: string;

  @ApiProperty()
  createdBAL: Record<
    string,
    {
      total: number;
      published: number;
      draft: number;
      demo: number;
    }
  >;
}
