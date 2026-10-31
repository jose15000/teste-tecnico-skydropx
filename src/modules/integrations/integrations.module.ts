import { Module } from '@nestjs/common';
import { GoogleSheetsClient } from './google-sheets/google-sheets.client.js';
import { SkydropxClient } from './skydropx/skydropx.client.js';

@Module({
  providers: [GoogleSheetsClient, SkydropxClient],
  exports: [GoogleSheetsClient, SkydropxClient],
})
export class IntegrationsModule {}
