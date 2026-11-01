import * as migration_20261015_154806_initial from './20261015_154806_initial';
import * as migration_20261016_041511_site_settings_business_hours from './20261016_041511_site_settings_business_hours';
import * as migration_20261016_064507_phase4_private_files from './20261016_064507_phase4_private_files';
import * as migration_20261016_101604_phase5_voice_samples from './20261016_101604_phase5_voice_samples';
import * as migration_20261016_112233_phase5_voice_sample_lang from './20261016_112233_phase5_voice_sample_lang';
import * as migration_20261016_130245_phase5_team_quote from './20261016_130245_phase5_team_quote';
import * as migration_20261016_190338_phase7_store from './20261016_190338_phase7_store';
import * as migration_20261017_040434_phase8_licensing from './20261017_040434_phase8_licensing';
import * as migration_20261017_045458_phase8_email_claims from './20261017_045458_phase8_email_claims';
import * as migration_20261017_060635_phase9_store_operations from './20261017_060635_phase9_store_operations';
import * as migration_20261017_065846_phase9_job_tasks from './20261017_065846_phase9_job_tasks';
import * as migration_20261101_054132_launch_grievance_officer from './20261101_054132_launch_grievance_officer';

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
    name: '20261016_130245_phase5_team_quote',
  },
  {
    up: migration_20261016_190338_phase7_store.up,
    down: migration_20261016_190338_phase7_store.down,
    name: '20261016_190338_phase7_store',
  },
  {
    up: migration_20261017_040434_phase8_licensing.up,
    down: migration_20261017_040434_phase8_licensing.down,
    name: '20261017_040434_phase8_licensing',
  },
  {
    up: migration_20261017_045458_phase8_email_claims.up,
    down: migration_20261017_045458_phase8_email_claims.down,
    name: '20261017_045458_phase8_email_claims',
  },
  {
    up: migration_20261017_060635_phase9_store_operations.up,
    down: migration_20261017_060635_phase9_store_operations.down,
    name: '20261017_060635_phase9_store_operations',
  },
  {
    up: migration_20261017_065846_phase9_job_tasks.up,
    down: migration_20261017_065846_phase9_job_tasks.down,
    name: '20261017_065846_phase9_job_tasks',
  },
  {
    up: migration_20261101_054132_launch_grievance_officer.up,
    down: migration_20261101_054132_launch_grievance_officer.down,
    name: '20261101_054132_launch_grievance_officer'
  },
];
