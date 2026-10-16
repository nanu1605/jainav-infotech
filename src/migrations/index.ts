import * as migration_20261015_154806_initial from './20261015_154806_initial';
import * as migration_20261016_041511_site_settings_business_hours from './20261016_041511_site_settings_business_hours';

export const migrations = [
  {
    up: migration_20261015_154806_initial.up,
    down: migration_20261015_154806_initial.down,
    name: '20261015_154806_initial',
  },
  {
    up: migration_20261016_041511_site_settings_business_hours.up,
    down: migration_20261016_041511_site_settings_business_hours.down,
    name: '20261016_041511_site_settings_business_hours'
  },
];
