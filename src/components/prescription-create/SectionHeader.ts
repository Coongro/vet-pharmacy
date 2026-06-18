/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

const React = getHostReact();
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const UI = getHostUI();
const h = React.createElement;

export function SectionHeader(props: { title: string; badge?: string }) {
  return h(
    'div',
    { className: 'flex items-center gap-2 pt-1' },
    h(
      'span',
      {
        className: 'text-[12px] font-semibold text-[var(--cg-text-muted)] uppercase tracking-wide',
      },
      props.title
    ),
    props.badge ? h(UI.Badge, { variant: 'brand', size: 'sm' }, props.badge) : null,
    h(UI.Separator, { className: 'flex-1' })
  );
}

export function ReadOnlyField(props: { label: string; value: string }) {
  return h(
    'div',
    { className: 'flex flex-col gap-0.5' },
    h(UI.Label, { className: 'text-[11px] text-[var(--cg-text-muted)]' }, props.label),
    h('span', { className: 'text-[13px] text-[var(--cg-text)]' }, props.value || '—')
  );
}
