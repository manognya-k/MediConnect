package com.cts.mfrp.controller;

import com.cts.mfrp.entity.LabReport;
import com.cts.mfrp.service.LabReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/lab-reports")
@RequiredArgsConstructor
public class LabReportController {
    private final LabReportService labReportService;
    
    @GetMapping
    public ResponseEntity<List<LabReport>> getAllReports() {
        return ResponseEntity.ok(labReportService.getAllReports());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<LabReport> getReportById(@PathVariable Integer id) {
        return ResponseEntity.ok(labReportService.getReportById(id));
    }
    
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<LabReport>> getReportsByPatient(@PathVariable Integer patientId) {
        return ResponseEntity.ok(labReportService.getReportsByPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<LabReport>> getReportsByDoctor(@PathVariable Integer doctorId) {
        return ResponseEntity.ok(labReportService.getReportsByDoctor(doctorId));
    }
    
    @PostMapping
    public ResponseEntity<LabReport> createReport(@RequestBody LabReport report) {
        return ResponseEntity.ok(labReportService.saveReport(report));
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<LabReport> updateReport(@PathVariable Integer id, @RequestBody LabReport report) {
        report.setReportId(id);
        return ResponseEntity.ok(labReportService.saveReport(report));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable Integer id) {
        labReportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }
}
