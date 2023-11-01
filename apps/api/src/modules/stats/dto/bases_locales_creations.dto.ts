import { ApiProperty } from '@nestjs/swagger';

export class BasesLocalesCreationDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  createdBAL: Record<
    string,
    {
      total: number;
      published: number;
      draft: number;
      readyToPublish: number;
      demo: number;
    }
  >;
}
