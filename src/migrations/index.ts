import * as migration_20261015_154806_initial from './20261015_154806_initial';
import * as migration_20261016_041511_site_settings_business_hours from './20261016_041511_site_settings_business_hours';
import * as migration_20261016_064507_phase4_private_files from './20261016_064507_phase4_private_files';
import * as migration_20261016_101604_phase5_voice_samples from './20261016_101604_phase5_voice_samples';
import * as migration_20261016_112233_phase5_voice_sample_lang from './20261016_112233_phase5_voice_sample_lang';
import * as migration_20261016_130245_phase5_team_quote from './20261016_130245_phase5_team_quote';

export const migrations = [
  {
    up: migration_20261015_154806_initial.up,
    down: migration_20261015_154806_initial.down,
    name: '20261015_154806_initial',
  },
  {
    up: migration_20261016_041511_site_settings_business_hours.up,
    down: migration_20261016_041511_site_settings_business_hours.down,
    name: '20261016_041511_site_settings_business_hours',
  },
  {
    up: migration_20261016_064507_phase4_private_files.up,
    down: migration_20261016_064507_phase4_private_files.down,
    name: '20261016_064507_phase4_private_files',
  },
  {
    up: migration_20261016_101604_phase5_voice_samples.up,
    down: migration_20261016_101604_phase5_voice_samples.down,
    name: '20261016_101604_phase5_voice_samples',
  },
  {
    up: migration_20261016_112233_phase5_voice_sample_lang.up,
    down: migration_20261016_112233_phase5_voice_sample_lang.down,
    name: '20261016_112233_phase5_voice_sample_lang',
  },
  {
    up: migration_20261016_130245_phase5_team_quote.up,
    down: migration_20261016_130245_phase5_team_quote.down,
    name: '20261016_130245_phase5_team_quote'
  },
];
