import { Injectable, Logger } from '@nestjs/common';
import type { ShippingAddress } from '../../interfaces/catalog.interface.js';
import type { PackedBox } from '../../interfaces/packaging.interface.js';
import type {
  BoxQuotationResult,
  MultiStrategyQuotationResult,
} from '../../interfaces/shipping.interface.js';
import { SkydropxClient } from '../integrations/skydropx/skydropx.client.js';
import {
  findBestRates,
  normalizeRates,
  toAddressPayload,
  toParcelPayload,
  toSheetRows,
} from './quotation-mappers.js';
import { QuotationsRepository } from './quotations.repository.js';

@Injectable()
export class QuotationsService {
  private readonly logger = new Logger(QuotationsService.name);

  constructor(
    private readonly skydropxClient: SkydropxClient,
    private readonly quotationsRepository: QuotationsRepository,
  ) {}

  /**
   * Quotes shipping rates for a single PackedBox via the Skydropx API.
   */
  async quoteBox(
    box: PackedBox,
    origin: ShippingAddress,
    destination: ShippingAddress,
  ): Promise<BoxQuotationResult> {
    const created = await this.skydropxClient.createQuotation({
      quotation: {
        address_from: toAddressPayload(origin),
        address_to: toAddressPayload(destination),
        parcels: [toParcelPayload(box)],
      },
    });

    const completed = await this.skydropxClient.pollQuotationUntilCompleted(created.id);
    const rates = normalizeRates(completed.rates ?? []);
    const { cheapest, fastest, bestBalance } = findBestRates(rates);

    return {
      boxId: box.boxId,
      strategy: box.strategy,
      quotationId: completed.id,
      rates,
      cheapestRate: cheapest,
      fastestRate: fastest,
      bestBalanceRate: bestBalance,
    };
  }

  /**
   * Quotes a list of boxes with individual failure isolation.
   */
  async quoteBoxes(
    boxes: PackedBox[],
    origin: ShippingAddress,
    destination: ShippingAddress,
  ): Promise<BoxQuotationResult[]> {
    const results: BoxQuotationResult[] = [];

    for (const box of boxes) {
      try {
        results.push(await this.quoteBox(box, origin, destination));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Box ${box.boxId} quotation failed: ${message}`);
        results.push({
          boxId: box.boxId,
          strategy: box.strategy,
          quotationId: '',
          rates: [],
        });
      }
    }

    return results;
  }

  /**
   * Quotes all boxes across strategies and saves normalized rows to Google Sheets.
   */
  async quoteBothStrategies(
    minBoxes: PackedBox[],
    minBillable: PackedBox[],
    origin: ShippingAddress,
    destination: ShippingAddress,
  ): Promise<MultiStrategyQuotationResult> {
    this.logger.log(`Quoting ${minBoxes.length} MIN_BOXES + ${minBillable.length} MIN_BILLABLE_WEIGHT...`);

    const minBoxesResults = await this.quoteBoxes(minBoxes, origin, destination);
    const minBillableResults = await this.quoteBoxes(minBillable, origin, destination);

    const allSheetRows = [
      ...minBoxesResults.flatMap((r) => toSheetRows(r.rates, r.strategy, r.boxId)),
      ...minBillableResults.flatMap((r) => toSheetRows(r.rates, r.strategy, r.boxId)),
    ];

    await this.quotationsRepository.saveQuotations(allSheetRows);

    return { minBoxesResults, minBillableResults, allSheetRows };
  }
}
