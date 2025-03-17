import { Test, TestingModule } from '@nestjs/testing';
import { EvalService } from './eval.service';

describe('EvalService', () => {
  let service: EvalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvalService],
    }).compile();

    service = module.get<EvalService>(EvalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
