package com.cts.mfrp.service;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final NotificationService notificationService;
    private final WebSocketEventPublisher wsPublisher;

    public List<Prescription> getByPatient(Integer patientId) {
        return prescriptionRepository.findByPatientPatientIdOrderByCreatedAtDesc(patientId);
    }

    public List<Prescription> getByDoctor(Integer doctorId) {
        return prescriptionRepository.findByDoctorDoctorIdOrderByCreatedAtDesc(doctorId);
    }

    public List<Prescription> getByMedicalRecord(Integer recordId) {
        return prescriptionRepository.findByMedicalRecordRecordId(recordId);
    }

    @Transactional
    public Prescription create(Map<String, Object> body) {
        Integer patientId = Integer.valueOf(body.get("patientId").toString());
        Integer doctorId  = Integer.valueOf(body.get("doctorId").toString());

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found"));
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));

        Prescription p = new Prescription();
        p.setPatient(patient);
        p.setDoctor(doctor);
        p.setMedicationName(body.getOrDefault("medicationName", "").toString());
        p.setDosage(body.getOrDefault("dosage", "").toString());
        p.setInstructions(body.getOrDefault("instructions", "").toString());

        if (body.containsKey("medicalRecordId")) {
            Integer recordId = Integer.valueOf(body.get("medicalRecordId").toString());
            medicalRecordRepository.findById(recordId).ifPresent(p::setMedicalRecord);
        }

        Prescription saved = prescriptionRepository.save(p);

        // Notify patient and push via WebSocket
        Integer patientUserId = patient.getUser() != null ? patient.getUser().getUserId() : null;
        if (patientUserId != null) {
            notificationService.createNotification(patientUserId, "PRESCRIPTION",
                    "New prescription from Dr. " + doctor.getUser().getName() + ": " + saved.getMedicationName());
            wsPublisher.publishToUser(patientUserId, "prescription-created", Map.of(
                    "id", saved.getId(),
                    "medicationName", saved.getMedicationName(),
                    "dosage", saved.getDosage(),
                    "instructions", saved.getInstructions()
            ));
        }
        return saved;
    }

    @Transactional
    public Prescription update(Integer id, Map<String, Object> body) {
        Prescription p = prescriptionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prescription not found"));
        if (body.containsKey("medicationName")) p.setMedicationName(body.get("medicationName").toString());
        if (body.containsKey("dosage"))         p.setDosage(body.get("dosage").toString());
        if (body.containsKey("instructions"))   p.setInstructions(body.get("instructions").toString());
        Prescription saved = prescriptionRepository.save(p);

        Integer patientUserId = p.getPatient().getUser() != null ? p.getPatient().getUser().getUserId() : null;
        if (patientUserId != null) {
            wsPublisher.publishToUser(patientUserId, "prescription-updated", Map.of("id", saved.getId()));
        }
        return saved;
    }
}
