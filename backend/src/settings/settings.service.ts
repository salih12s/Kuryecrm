import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Setting keys and their code-level defaults (used when no DB row exists). */
export const SETTING_DEFAULTS = {
  courier_location_interval_seconds: '20',
  courier_offline_threshold_seconds: '90',
  partners_can_edit_finance: 'false',
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async raw(key: SettingKey): Promise<string> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } });
    return row?.value ?? SETTING_DEFAULTS[key];
  }

  async getInt(key: SettingKey): Promise<number> {
    const parsed = Number(await this.raw(key));
    return Number.isFinite(parsed) ? parsed : Number(SETTING_DEFAULTS[key]);
  }

  async getBool(key: SettingKey): Promise<boolean> {
    return (await this.raw(key)).toLowerCase() === 'true';
  }

  /** All settings merged over defaults, as strings. */
  async getAll(): Promise<Record<SettingKey, string>> {
    const rows = await this.prisma.appSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const out = { ...SETTING_DEFAULTS } as Record<SettingKey, string>;
    for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
      if (map.has(key)) out[key] = map.get(key)!;
    }
    return out;
  }

  /** Upserts known keys only; unknown keys are ignored. */
  async setMany(values: Partial<Record<SettingKey, string>>): Promise<Record<SettingKey, string>> {
    const entries = Object.entries(values).filter(([key]) => key in SETTING_DEFAULTS) as [SettingKey, string][];
    await this.prisma.$transaction(
      entries.map(([key, value]) =>
        this.prisma.appSetting.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        }),
      ),
    );
    return this.getAll();
  }
}
