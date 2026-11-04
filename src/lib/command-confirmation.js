export function isCommandConfirmed(cmd, row) {
  if (!row) return false;
  if (cmd.baselineLogKey && row._key === cmd.baselineLogKey) return false;
  if (
    typeof cmd.baselineLogTs === 'number' &&
    typeof row.ts === 'number' &&
    row.ts < cmd.baselineLogTs
  ) {
    return false;
  }

  switch (cmd.action) {
    case 'auto':
      return ['mist', 'irigasi', 'blower'].every((k) => row.override[k] === 'auto');
    case 'mist':
    case 'irigasi':
    case 'blower': {
      const mode = cmd.mode || (cmd.value ? 'on' : 'off');
      const current = row.override[cmd.action];
      if (current === 'on' || current === 'off' || current === 'auto') {
        return current === mode;
      }
      return cmd.value ? row[cmd.action] === true : row.manual === false;
    }
    case 'set_vpd':
      return row.phase.target !== null && Math.abs(row.phase.target - cmd.value) < 0.01;
    case 'set_fase':
      return cmd.value ? row.phase.name === cmd.value : row.phase.active === false;
    case 'set_durasi':
      return row.phase.duration !== null && row.phase.duration === cmd.seconds;
    case 'fase_reset':
      return row.phase.elapsed !== null && row.phase.elapsed <= 5;
    default:
      return false;
  }
}
