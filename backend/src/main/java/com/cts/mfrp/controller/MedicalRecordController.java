package com.cts.mfrp.controller;

import com.cts.mfrp.entity.MedicalRecord;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.DoctorRepository;
import com.cts.mfrp.repository.PatientRepository;
import com.cts.mfrp.repository.UserRepository;
import com.cts.mfrp.service.MedicalRecordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
@RequiredArgsConstructor
public class MedicalRecordController {
    private final MedicalRecordService medicalRecordService;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    @GetMapping
    public ResponseEntity<List<MedicalRecord>> getAllRecords() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User caller = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        String role = caller.getRole();

        if ("PATIENT".equalsIgnoreCase(role)) {
            return patientRepository.findByUserUserId(caller.getUserId())
                    .map(p -> ResponseEntity.ok(medicalRecordService.getRecordsByPatient(p.getPatientId())))
                    .orElse(ResponseEntity.ok(List.of()));
        }
        if ("DOCTOR".equalsIgnoreCase(role)) {
            return doctorRepository.findByUserEmail(email)
                    .map(d -> ResponseEntity.ok(medicalRecordService.getRecordsByDoctor(d.getDoctorId())))
                    .orElse(ResponseEntity.ok(List.of()));
        }
        if ("ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.ok(medicalRecordService.getAllRecords());
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecord> getRecordById(@PathVariable Integer id) {
        return ResponseEntity.ok(medicalRecordService.getRecordById(id));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<MedicalRecord>> getRecordsByPatient(@PathVariable Integer patientId) {
        return ResponseEntity.ok(medicalRecordService.getRecordsByPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<MedicalRecord>> getRecordsByDoctor(@PathVariable Integer doctorId) {
        return ResponseEntity.ok(medicalRecordService.getRecordsByDoctor(doctorId));
    }

    @PostMapping
    public ResponseEntity<MedicalRecord> createRecord(@Valid @RequestBody MedicalRecord record) {
        return ResponseEntity.ok(medicalRecordService.saveRecord(record));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicalRecord> updateRecord(@PathVariable Integer id, @Valid @RequestBody MedicalRecord record) {
        record.setRecordId(id);
        return ResponseEntity.ok(medicalRecordService.saveRecord(record));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecord(@PathVariable Integer id) {
        medicalRecordService.deleteRecord(id);
        return ResponseEntity.noContent().build(); // FIXED: was ok()
    }
}