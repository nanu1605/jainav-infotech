import * as migration_20261015_154806_initial from './20261015_154806_initial';
import * as migration_20261016_041511_site_settings_business_hours from './20261016_041511_site_settings_business_hours';
import * as migration_20261016_064507_phase4_private_files from './20261016_064507_phase4_private_files';

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
    name: '20261016_064507_phase4_private_files'
  },
];
