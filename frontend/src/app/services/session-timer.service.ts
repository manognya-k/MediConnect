import { Injectable } from '@angular/core';
import { Observable, interval } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SessionTimerService {

  getCountdown(scheduledTime: string): Observable<string> {
    return interval(60000).pipe(
      startWith(0),
      map(() => {
        const diff = new Date(scheduledTime).getTime() - Date.now();
        if (diff <= 0) return 'Live';
        if (diff < 3600000) return `In ${Math.floor(diff / 60000)}m`;
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        return mins > 0 ? `In ${hours}h ${mins}m` : `In ${hours}h`;
      })
    );
  }

  getElapsed(startedAt: string): Observable<string> {
    return interval(60000).pipe(
      startWith(0),
      map(() => {
        const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
        return `${Math.max(0, elapsed)}m in`;
      })
    );
  }
}
