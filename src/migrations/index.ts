import * as migration_20261015_150543_initial from './20261015_150543_initial';

export const migrations = [
  {
    up: migration_20261015_150543_initial.up,
    down: migration_20261015_150543_initial.down,
    name: '20261015_150543_initial'
  },
];
