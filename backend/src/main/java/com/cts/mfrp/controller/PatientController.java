package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Medicine;
import com.cts.mfrp.entity.Patient;
import com.cts.mfrp.entity.Vitals;
import com.cts.mfrp.repository.MedicineRepository;
import com.cts.mfrp.repository.VitalsRepository;
import com.cts.mfrp.service.DashboardDataService;
import com.cts.mfrp.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {
    private final PatientService patientService;
    private final DashboardDataService dashboardDataService;
    private final VitalsRepository vitalsRepository;
    private final MedicineRepository medicineRepository;

    @GetMapping
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(patientService.getAllPatients());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Patient> getPatientById(@PathVariable Integer id) {
        return ResponseEntity.ok(patientService.getPatientById(id));
    }

    @GetMapping("/by-user/{userId}")
    public ResponseEntity<Patient> getPatientByUserId(@PathVariable Integer userId) {
        return ResponseEntity.ok(patientService.getPatientByUserId(userId));
    }

    @GetMapping("/{id}/vitals")
    public ResponseEntity<?> getPatientVitals(@PathVariable Integer id) {
        return ResponseEntity.ok(dashboardDataService.getPatientVitals(id));
    }

    @PostMapping("/{id}/vitals")
    public ResponseEntity<Vitals> addVitals(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        Patient patient = patientService.getPatientById(id);
        Vitals v = new Vitals();
        v.setPatient(patient);
        if (body.containsKey("bp"))        v.setBp(body.get("bp").toString());
        if (body.containsKey("heartRate")) v.setHeartRate(Integer.valueOf(body.get("heartRate").toString()));
        if (body.containsKey("glucose"))   v.setGlucose(new BigDecimal(body.get("glucose").toString()));
        if (body.containsKey("bmi"))       v.setBmi(new BigDecimal(body.get("bmi").toString()));
        return ResponseEntity.status(HttpStatus.CREATED).body(vitalsRepository.save(v));
    }

    @GetMapping("/{id}/medicines")
    public ResponseEntity<?> getPatientMedicines(@PathVariable Integer id) {
        return ResponseEntity.ok(dashboardDataService.getPatientMedicines(id));
    }

    @PostMapping("/{id}/medicines")
    public ResponseEntity<Medicine> addMedicine(@PathVariable Integer id, @RequestBody Map<String, Object> body) {
        Patient patient = patientService.getPatientById(id);
        Medicine m = new Medicine();
        m.setPatient(patient);
        m.setMedicineName(body.getOrDefault("medicineName", "").toString());
        m.setDosage(body.getOrDefault("dosage", "").toString());
        m.setFrequency(body.getOrDefault("frequency", "").toString());
        if (body.containsKey("scheduledTime")) m.setScheduledTime(body.get("scheduledTime").toString());
        if (body.containsKey("status"))        m.setStatus(body.get("status").toString());
        return ResponseEntity.status(HttpStatus.CREATED).body(medicineRepository.save(m));
    }

    @GetMapping("/{id}/activities")
    public ResponseEntity<?> getPatientActivities(@PathVariable Integer id) {
        return ResponseEntity.ok(dashboardDataService.getPatientActivities(id));
    }

    @PostMapping
    public ResponseEntity<Patient> createPatient(@Valid @RequestBody Patient patient) {
        return ResponseEntity.ok(patientService.savePatient(patient));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> updatePatient(@PathVariable Integer id, @Valid @RequestBody Patient patient) {
        patient.setPatientId(id);
        return ResponseEntity.ok(patientService.savePatient(patient));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePatient(@PathVariable Integer id) {
        patientService.deletePatient(id);
        return ResponseEntity.noContent().build();
    }
}
