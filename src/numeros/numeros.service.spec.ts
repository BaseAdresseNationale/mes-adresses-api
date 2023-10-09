import { Test, TestingModule } from '@nestjs/testing';
import { NumerosService } from './numeros.service';

describe('NumeroService', () => {
  let service: NumerosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NumerosService],
    }).compile();

    service = module.get<NumerosService>(NumerosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
