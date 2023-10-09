import { Test, TestingModule } from '@nestjs/testing';
import { NumeroController } from './numero.controller';

describe('NumerosController', () => {
  let controller: NumeroController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NumeroController],
    }).compile();

    controller = module.get<NumeroController>(NumeroController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
