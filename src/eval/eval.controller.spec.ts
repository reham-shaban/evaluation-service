import { Test, TestingModule } from '@nestjs/testing';
import { EvalController } from './eval.controller';

describe('EvalController', () => {
  let controller: EvalController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvalController],
    }).compile();

    controller = module.get<EvalController>(EvalController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
