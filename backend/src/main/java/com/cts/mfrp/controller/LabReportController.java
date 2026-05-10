package com.cts.mfrp.controller;

import com.cts.mfrp.entity.LabReport;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.DoctorRepository;
import com.cts.mfrp.repository.PatientRepository;
import com.cts.mfrp.repository.UserRepository;
import com.cts.mfrp.service.LabReportService;
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
@RequestMapping("/api/lab-reports")
@RequiredArgsConstructor
public class LabReportController {
    private final LabReportService labReportService;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    /** Role-scoped: PATIENT → own, DOCTOR → own ordered, ADMIN → all. */
    @GetMapping
    public ResponseEntity<List<LabReport>> getAllReports() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User caller = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        String role = caller.getRole();

        if ("PATIENT".equalsIgnoreCase(role)) {
            return patientRepository.findByUserUserId(caller.getUserId())
                    .map(p -> ResponseEntity.ok(labReportService.getReportsByPatient(p.getPatientId())))
                    .orElse(ResponseEntity.ok(List.of()));
        }
        if ("DOCTOR".equalsIgnoreCase(role)) {
            return doctorRepository.findByUserEmail(caller.getEmail())
                    .map(d -> ResponseEntity.ok(labReportService.getReportsByDoctor(d.getDoctorId())))
                    .orElse(ResponseEntity.ok(List.of()));
        }
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

    @PostMapping
    public ResponseEntity<LabReport> createReport(@Valid @RequestBody LabReport report) {
        return ResponseEntity.ok(labReportService.saveReport(report));
    }

    @PutMapping("/{id}")
    public ResponseEntity<LabReport> updateReport(@PathVariable Integer id, @Valid @RequestBody LabReport report) {
        report.setReportId(id);
        return ResponseEntity.ok(labReportService.saveReport(report));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReport(@PathVariable Integer id) {
        labReportService.deleteReport(id);
        return ResponseEntity.noContent().build();
    }
}
