package com.cts.mfrp.controller;

import com.cts.mfrp.entity.MedicalRecord;
import com.cts.mfrp.service.MedicalRecordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/medical-records")
@RequiredArgsConstructor
public class MedicalRecordController {
    private final MedicalRecordService medicalRecordService;

    @GetMapping
    public ResponseEntity<List<MedicalRecord>> getAllRecords() {
        return ResponseEntity.ok(medicalRecordService.getAllRecords());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicalRecord> getRecordById(@PathVariable Integer id) {
        return ResponseEntity.ok(medicalRecordService.getRecordById(id));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<MedicalRecord>> getRecordsByPatient(@PathVariable Integer patientId) {
        return ResponseEntity.ok(medicalRecordService.getRecordsByPatient(patientId));
    }

    @PostMapping
    public ResponseEntity<MedicalRecord> createRecord(@RequestBody MedicalRecord record) {
        return ResponseEntity.ok(medicalRecordService.saveRecord(record));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MedicalRecord> updateRecord(@PathVariable Integer id, @RequestBody MedicalRecord record) {
        record.setRecordId(id);
        return ResponseEntity.ok(medicalRecordService.saveRecord(record));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecord(@PathVariable Integer id) {
        medicalRecordService.deleteRecord(id);
        return ResponseEntity.noContent().build(); // FIXED: was ok()
    }
}