package com.cts.mfrp.service;

import com.cts.mfrp.entity.MedicalRecord;
import com.cts.mfrp.entity.Prescription;
import com.cts.mfrp.repository.MedicalRecordRepository;
import com.cts.mfrp.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicalRecordService {
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;

    public List<MedicalRecord> getAllRecords() {
        return medicalRecordRepository.findAll();
    }

    public MedicalRecord getRecordById(Integer id) {
        return medicalRecordRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medical record not found"));
    }

    public List<MedicalRecord> getRecordsByPatient(Integer patientId) {
        return medicalRecordRepository.findByPatientPatientId(patientId);
    }

    public List<MedicalRecord> getRecordsByDoctor(Integer doctorId) {
        return medicalRecordRepository.findByDoctorDoctorId(doctorId);
    }

    @Transactional
    public MedicalRecord saveRecord(MedicalRecord record) {
        boolean isUpdate = record.getRecordId() != null;

        // On update, remove old auto-created prescriptions for this record so we can recreate
        if (isUpdate) {
            List<Prescription> existing = prescriptionRepository.findByMedicalRecordRecordId(record.getRecordId());
            if (!existing.isEmpty()) {
                prescriptionRepository.deleteAll(existing);
            }
        }

        MedicalRecord saved = medicalRecordRepository.save(record);

        // Parse prescription text and create Prescription entities so they appear in reminders
        String prescriptionText = saved.getPrescription();
        if (prescriptionText != null && !prescriptionText.isBlank()
                && saved.getPatient() != null && saved.getDoctor() != null) {
            for (String line : prescriptionText.split("\n")) {
                line = line.trim();
                if (line.isEmpty()) continue;
                String[] parts = line.split("\\|");
                String medName = parts[0].trim();
                String dosage  = parts.length > 1 ? parts[1].trim() : "";
                String instr   = parts.length > 2 ? parts[2].trim() : "Once daily";

                Prescription p = new Prescription();
                p.setPatient(saved.getPatient());
                p.setDoctor(saved.getDoctor());
                p.setMedicalRecord(saved);
                p.setMedicationName(medName);
                p.setDosage(dosage);
                p.setInstructions(instr);
                prescriptionRepository.save(p);
            }
        }

        return saved;
    }

    public void deleteRecord(Integer id) {
        if (!medicalRecordRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Medical record not found");
        }
        medicalRecordRepository.deleteById(id);
    }
}
