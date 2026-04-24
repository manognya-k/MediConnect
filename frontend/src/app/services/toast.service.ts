import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _counter = 0;
  toasts$ = new Subject<Toast[]>();
  private _list: Toast[] = [];

  show(message: string, type: Toast['type'] = 'success') {
    const t: Toast = { id: ++this._counter, message, type };
    this._list = [...this._list, t];
    this.toasts$.next(this._list);
    setTimeout(() => this.dismiss(t.id), 3000);
  }

  dismiss(id: number) {
    this._list = this._list.filter(t => t.id !== id);
    this.toasts$.next(this._list);
  }
}
