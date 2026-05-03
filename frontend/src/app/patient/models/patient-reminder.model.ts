export type DoseStatus = 'done' | 'next' | 'upcoming';

export interface DoseItem {
  doseId: string;
  medicineId: string;
  medicineName: string;   // e.g. "Amlodipine 5mg"
  dosage: string;         // e.g. "1 tablet · After breakfast"
  status: DoseStatus;
  isTaken: boolean;       // mirrors status === 'done'
}

export interface TimeSlot {
  time: string;           // "8:00 AM" | "2:00 PM" | "8:00 PM"
  status: DoseStatus;     // drives dot colour and time-label colour
  doses: DoseItem[];
}

export interface MedicineStats {
  activeMedicines: number;
  takenToday: number;
  dueToday: number;
  adherencePercent: number;
}

export interface ActivePrescription {
  id: string;
  medicineName: string;
  frequency: string;      // "1× daily"
  timing: string;         // "Morning"
  indication: string;     // "Hypertension"
  prescribedBy: string;
  refillDate: string;     // ISO date string
  status: 'Active' | 'Paused' | 'Discontinued';
}
