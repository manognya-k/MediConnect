import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-note',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-note.component.html',
  styleUrl: './add-note.component.scss'
})
export class AddNoteComponent {
  @Output() saved = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  noteText = '';
  submitted = false;

  readonly maxLen = 500;
  get noteLength(): number { return this.noteText.length; }

  save() {
    this.submitted = true;
    if (!this.noteText.trim() || this.noteText.length > this.maxLen) return;
    this.saved.emit(this.noteText.trim());
  }

  cancel() { this.cancelled.emit(); }
}
