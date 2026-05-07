import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-sparkline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.viewBox]="'0 0 ' + w() + ' ' + h()" [attr.width]="w()" [attr.height]="h()" preserveAspectRatio="none">
      @if (data().length > 1) {
        <path [attr.d]="fillPath()" [attr.fill]="fill()" stroke="none"/>
        <path [attr.d]="linePath()" [attr.stroke]="color()" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
      }
    </svg>
  `,
  styles: [`:host { display: block; } svg { display: block; width: 100%; height: 100%; }`],
})
export class SparklineComponent {
  data  = input<number[]>([]);
  state = input<'on' | 'off' | 'borderline'>('on');
  w     = input<number>(240);
  h     = input<number>(42);

  color = computed(() => {
    const s = this.state();
    return s === 'on' ? 'var(--success)' : s === 'borderline' ? 'var(--warn)' : 'var(--danger)';
  });
  fill = computed(() => {
    const s = this.state();
    return s === 'on' ? 'var(--success-soft)' : s === 'borderline' ? 'var(--warn-soft)' : 'var(--danger-soft)';
  });

  linePath = computed(() => {
    const d = this.data();
    if (d.length < 2) return '';
    const min = Math.min(...d), max = Math.max(...d);
    const span = max - min || 1;
    const W = this.w(), H = this.h();
    const step = W / (d.length - 1);
    return d.map((v, i) => {
      const x = i * step;
      const y = H - ((v - min) / span) * (H - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  });

  fillPath = computed(() => `${this.linePath()} L${this.w()},${this.h()} L0,${this.h()} Z`);
}
