import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell } from '../src/lib/format.js';

test('prefixes spreadsheet formula-like CSV values as text', () => {
  for (const value of ['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1:A2)', '\t=1+1']) {
    assert.equal(csvCell(value), `'${value}`);
  }
});

test('preserves ordinary values and CSV quoting', () => {
  assert.equal(csvCell('sensor aman'), 'sensor aman');
  assert.equal(csvCell('fase, pagi'), '"fase, pagi"');
  assert.equal(csvCell('line\nnext'), '"line\nnext"');
  assert.equal(csvCell(null), '');
});
