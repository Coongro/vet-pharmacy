/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact } from '@coongro/plugin-sdk';

import { FREQUENCY_HOURS } from '../../constants/medication.js';

const React = getHostReact();
const h = React.createElement;

const DURATION_PRESETS = [3, 5, 7, 10, 14, 21, 30];

function Chip(props: { active: boolean; label: string; onClick: () => void }) {
  return h(
    'button',
    {
      type: 'button',
      className: `px-2 py-0.5 rounded text-[11px] border transition-colors ${
        props.active
          ? 'bg-[var(--cg-accent-bg)] border-[var(--cg-accent)] text-[var(--cg-accent)] font-medium'
          : 'bg-[var(--cg-bg)] border-[var(--cg-border)] text-[var(--cg-text-muted)] hover:border-[var(--cg-text-muted)]'
      }`,
      onClick: props.onClick,
    },
    props.label
  );
}

export function FrequencyChips(props: { value: number | null; onChange: (v: number) => void }) {
  return h(
    'div',
    { className: 'flex gap-1 flex-wrap' },
    ...FREQUENCY_HOURS.map((hrs) =>
      h(Chip, {
        key: hrs,
        active: props.value === hrs,
        label: `${hrs}h`,
        onClick: () => props.onChange(hrs),
      })
    )
  );
}

export function DurationChips(props: { value: number | null; onChange: (v: number) => void }) {
  return h(
    'div',
    { className: 'flex gap-1 flex-wrap' },
    ...DURATION_PRESETS.map((d) =>
      h(Chip, {
        key: d,
        active: props.value === d,
        label: String(d),
        onClick: () => props.onChange(d),
      })
    )
  );
}
