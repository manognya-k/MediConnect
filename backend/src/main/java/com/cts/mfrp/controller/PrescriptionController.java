package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Prescription;
import com.cts.mfrp.service.PrescriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR','ADMIN')")
    public ResponseEntity<List<Prescription>> getByPatient(@PathVariable Integer patientId) {
        return ResponseEntity.ok(prescriptionService.getByPatient(patientId));
    }

    @GetMapping("/medical-record/{recordId}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR','ADMIN')")
    public ResponseEntity<List<Prescription>> getByMedicalRecord(@PathVariable Integer recordId) {
        return ResponseEntity.ok(prescriptionService.getByMedicalRecord(recordId));
    }

    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public ResponseEntity<List<Prescription>> getByDoctor(@PathVariable Integer doctorId) {
        return ResponseEntity.ok(prescriptionService.getByDoctor(doctorId));
    }

    @PostMapping("/create")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public ResponseEntity<Prescription> create(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(prescriptionService.create(body));
    }

    @PutMapping("/update/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public ResponseEntity<Prescription> update(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(prescriptionService.update(id, body));
    }
}
