import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupplyChainService } from '../../../services/supply-chain.service';
import { ToastService } from '../../../services/toast.service';
import { InventoryItem } from '../../../models/inventory.model';

@Component({
  selector: 'app-inventory-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory-item-form.component.html',
  styleUrl: './inventory-item-form.component.scss'
})
export class InventoryItemFormComponent implements OnInit {
  @Input() editData: InventoryItem | null = null;
  @Input() hospitalId: number | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  submitting = false;

  readonly categories = ['Medication', 'Equipment', 'Consumable', 'PPE'];

  constructor(
    private fb: FormBuilder,
    private svc: SupplyChainService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      itemName:     [this.editData?.itemName ?? '', [Validators.required, Validators.maxLength(100)]],
      category:     [this.editData?.category ?? 'Medication', Validators.required],
      quantity:     [this.editData?.quantity ?? null, [Validators.required, Validators.min(0)]],
      reorderLevel: [this.editData?.reorderLevel ?? null, [Validators.required, Validators.min(1)]],
    });
  }

  get isEdit(): boolean { return !!this.editData; }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const v = this.form.value;
    const body = {
      itemName:     v.itemName.trim(),
      category:     v.category,
      quantity:     +v.quantity,
      reorderLevel: +v.reorderLevel,
      hospital:     this.hospitalId ? { hospitalId: this.hospitalId } : undefined,
    };

    const req$ = this.isEdit
      ? this.svc.update(+this.editData!.id, { ...this.editData!.raw, ...body })
      : this.svc.create(body);

    req$.subscribe({
      next: () => {
        this.submitting = false;
        this.toast.show(this.isEdit ? 'Item updated.' : 'Item added.', 'success');
        this.saved.emit();
      },
      error: () => {
        this.submitting = false;
        this.toast.show('Failed to save item.', 'error');
      },
    });
  }

  hasError(field: string, err: string): boolean {
    const c = this.form.get(field);
    return !!(c?.touched && c.hasError(err));
  }
}
