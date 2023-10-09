import { Test, TestingModule } from '@nestjs/testing';
import { NumerosController } from './numeros.controller';

describe('NumerosController', () => {
  let controller: NumerosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NumerosController],
    }).compile();

    controller = module.get<NumerosController>(NumerosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
