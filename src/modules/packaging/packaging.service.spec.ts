import { Test, TestingModule } from '@nestjs/testing';
import { PackagingService } from './packaging.service';

describe('PackagingService', () => {
  let service: PackagingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PackagingService],
    }).compile();

    service = module.get<PackagingService>(PackagingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
