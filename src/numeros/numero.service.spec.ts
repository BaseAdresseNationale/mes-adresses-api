import { Test, TestingModule } from '@nestjs/testing';
import { NumeroService } from './numero.service';

describe('NumeroService', () => {
  let service: NumeroService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NumeroService],
    }).compile();

    service = module.get<NumeroService>(NumeroService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
