// Shared axis-tooltip formatter for the chart family. Keeps padding,
// value font-weight, and 2-decimal rounding consistent across charts.

export interface TooltipFormatterOptions {
  /** Per-series suffix appended to the value (e.g. '%'). */
  suffix?: string;
  /** Hide series whose name matches this predicate (e.g. internal '__band__'). */
  hideSeries?: (name: string) => boolean;
}

export function axisTooltipFormatter(opts: TooltipFormatterOptions = {}) {
  const { suffix = '', hideSeries } = opts;
  return (params: unknown) => {
    const arr = Array.isArray(params) ? params : [params];
    const visible = hideSeries
      ? arr.filter((p: any) => !hideSeries(String(p.seriesName ?? '')))
      : arr;
    if (visible.length === 0) return '';
    const header = (visible[0] as any).axisValueLabel ?? (visible[0] as any).axisValue ?? '';
    const rows = (visible as any[]).map((p) => {
      const raw = Array.isArray(p.value) ? p.value[1] : p.value;
      const val = (raw == null || Number.isNaN(raw))
        ? '—'
        : typeof raw === 'number' ? `${raw.toFixed(2)}${suffix}` : String(raw);
      const label = p.seriesName ? `<span>${p.seriesName}</span>` : '';
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;line-height:1.7;">`
        + `<span>${p.marker}${label ? ' ' + label : ''}</span>`
        + `<span style="font-weight:500;">${val}</span>`
        + `</div>`;
    }).join('');
    return `<div style="margin-bottom:2px;">${header}</div>${rows}`;
  };
}
