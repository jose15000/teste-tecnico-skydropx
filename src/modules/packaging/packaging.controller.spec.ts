import { Test, TestingModule } from '@nestjs/testing';
import { PackagingController } from './packaging.controller';

describe('PackagingController', () => {
  let controller: PackagingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackagingController],
    }).compile();

    controller = module.get<PackagingController>(PackagingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
