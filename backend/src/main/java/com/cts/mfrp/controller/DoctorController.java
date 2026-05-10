package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Doctor;
import com.cts.mfrp.entity.Patient;
import com.cts.mfrp.service.DoctorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {
    private final DoctorService doctorService;

    @GetMapping
    public ResponseEntity<List<Doctor>> getAllDoctors() {
        return ResponseEntity.ok(doctorService.getAllDoctors());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Doctor> getDoctorById(@PathVariable Integer id) {
        return ResponseEntity.ok(doctorService.getDoctorById(id));
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<Doctor>> getDoctorsByHospital(@PathVariable Integer hospitalId) {
        return ResponseEntity.ok(doctorService.getDoctorsByHospital(hospitalId));
    }

    @GetMapping("/specialization/{specialization}")
    public ResponseEntity<List<Doctor>> getDoctorsBySpecialization(@PathVariable String specialization) {
        return ResponseEntity.ok(doctorService.getDoctorsBySpecialization(specialization));
    }

    @GetMapping("/{doctorId}/patients")
    public ResponseEntity<List<Patient>> getDoctorPatients(@PathVariable Integer doctorId) {
        return ResponseEntity.ok(doctorService.getPatientsForDoctor(doctorId));
    }

    @GetMapping("/available")
    public ResponseEntity<List<Doctor>> getAvailableDoctors(
            @RequestParam String specialization,
            @RequestParam String date,
            @RequestParam String time) {
        return ResponseEntity.ok(doctorService.findAvailableDoctors(
                specialization, LocalDate.parse(date), LocalTime.parse(time)));
    }

    /** Returns available 30-min time slots for a doctor on a given date. */
    @GetMapping("/{doctorId}/available-slots")
    public ResponseEntity<Map<String, Object>> getAvailableSlots(
            @PathVariable Integer doctorId,
            @RequestParam String date) {
        List<String> slots = doctorService.getAvailableSlots(doctorId, LocalDate.parse(date));
        return ResponseEntity.ok(Map.of("availableSlots", slots));
    }

    @PostMapping
    public ResponseEntity<Doctor> createDoctor(@Valid @RequestBody Doctor doctor) {
        return ResponseEntity.ok(doctorService.saveDoctor(doctor));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Doctor> updateDoctor(@PathVariable Integer id, @Valid @RequestBody Doctor doctor) {
        doctor.setDoctorId(id);
        return ResponseEntity.ok(doctorService.saveDoctor(doctor));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Doctor> updateStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "AVAILABLE");
        return ResponseEntity.ok(doctorService.updateAvailabilityStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDoctor(@PathVariable Integer id) {
        doctorService.deleteDoctor(id);
        return ResponseEntity.noContent().build(); // FIXED: was ok()
    }
}
