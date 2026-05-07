import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (active()) { <div class="loading-bar"></div> }`,
})
export class LoadingBarComponent implements OnInit {
  active = signal(false);
  private router = inject(Router);

  ngOnInit(): void {
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationStart) this.active.set(true);
      else if (ev instanceof NavigationEnd || ev instanceof NavigationCancel || ev instanceof NavigationError) {
        this.active.set(false);
      }
    });
  }
}
