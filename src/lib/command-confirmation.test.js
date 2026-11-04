import test from 'node:test';
import assert from 'node:assert/strict';
import { isCommandConfirmed } from './command-confirmation.js';

const baseRow = {
  _key: '-Oexample-new',
  ts: 1_700_000_020,
  override: { mist: 'off', irigasi: 'auto', blower: 'auto' },
  phase: { target: 1.2, name: 'Vegetatif', active: true, duration: 86_400, elapsed: 10 },
  misting: false,
  irigasi: false,
  blower: false,
  manual: true,
};

test('does not confirm from the same telemetry record present before enqueue', () => {
  const command = {
    action: 'mist',
    value: false,
    mode: 'off',
    baselineLogKey: baseRow._key,
    baselineLogTs: baseRow.ts,
  };

  assert.equal(isCommandConfirmed(command, baseRow), false);
});

test('confirms the requested state from a newer telemetry record', () => {
  const command = {
    action: 'mist',
    value: false,
    mode: 'off',
    baselineLogKey: '-Oexample-old',
    baselineLogTs: baseRow.ts - 20,
  };

  assert.equal(isCommandConfirmed(command, baseRow), true);
});

test('does not confirm when telemetry state does not match the command', () => {
  const command = {
    action: 'set_vpd',
    value: 1.5,
    baselineLogKey: '-Oexample-old',
    baselineLogTs: baseRow.ts - 20,
  };

  assert.equal(isCommandConfirmed(command, baseRow), false);
});

test('confirms setpoint only from telemetry newer than the baseline', () => {
  const command = {
    action: 'set_vpd',
    value: 1.2,
    baselineLogKey: '-Oexample-old',
    baselineLogTs: baseRow.ts - 20,
  };

  assert.equal(isCommandConfirmed(command, baseRow), true);
});
