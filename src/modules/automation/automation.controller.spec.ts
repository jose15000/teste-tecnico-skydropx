import { describe, expect, it, vi } from 'vitest';
import { AutomationController } from './automation.controller.js';

describe('AutomationController', () => {
  it('POST /automation/run delegates to AutomationService.run', async () => {
    const expected = { totalUnits: 1, invalidItems: [], strategies: [] };
    const service = { run: vi.fn().mockResolvedValue(expected) };
    const controller = new AutomationController(service as never);

    await expect(controller.run()).resolves.toBe(expected);
    expect(service.run).toHaveBeenCalledTimes(1);
  });
});
