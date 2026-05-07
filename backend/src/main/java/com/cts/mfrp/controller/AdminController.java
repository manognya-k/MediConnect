package com.cts.mfrp.controller;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final HospitalRepository hospitalRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorRepository doctorRepository;
    private final BedRepository bedRepository;
    private final InventoryRepository inventoryRepository;
    private final LabReportRepository labReportRepository;

    /** Aggregated overview stats */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalHospitals", hospitalRepository.count());
        stats.put("totalPatients", patientRepository.count());
        stats.put("totalDoctors", doctorRepository.count());
        stats.put("totalAppointments", appointmentRepository.count());
        stats.put("totalInventoryItems", inventoryRepository.count());

        long totalBeds = bedRepository.count();
        long occupiedBeds = bedRepository.findByStatus("OCCUPIED").size();
        stats.put("totalBeds", totalBeds);
        stats.put("occupiedBeds", occupiedBeds);
        stats.put("icuOccupancyPct", totalBeds > 0 ? Math.round((double) occupiedBeds / totalBeds * 100) : 0);

        long onlineDoctors = doctorRepository.findAll().stream()
                .filter(d -> "AVAILABLE".equalsIgnoreCase(d.getAvailabilityStatus()))
                .count();
        stats.put("doctorsOnDuty", onlineDoctors);

        return ResponseEntity.ok(stats);
    }

    /** Bed occupancy by hospital */
    @GetMapping("/bed-occupancy")
    public ResponseEntity<List<Map<String, Object>>> getBedOccupancy() {
        List<Hospital> hospitals = hospitalRepository.findAll();
        List<Map<String, Object>> result = hospitals.stream().map(h -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("hospitalId", h.getHospitalId());
            row.put("hospitalName", h.getHospitalName());
            row.put("city", h.getCity());
            row.put("totalBeds", h.getTotalBeds());
            row.put("availableBeds", h.getAvailableBeds());
            int occupied = h.getTotalBeds() - h.getAvailableBeds();
            row.put("occupiedBeds", Math.max(0, occupied));
            row.put("occupancyPct", h.getTotalBeds() > 0
                    ? Math.round((double) Math.max(0, occupied) / h.getTotalBeds() * 100)
                    : 0);
            return row;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** Appointment status breakdown */
    @GetMapping("/appointment-stats")
    public ResponseEntity<Map<String, Object>> getAppointmentStats() {
        List<Appointment> all = appointmentRepository.findAll();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", all.size());
        stats.put("confirmed", all.stream().filter(a -> "CONFIRMED".equalsIgnoreCase(a.getStatus())).count());
        stats.put("pending", all.stream().filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).count());
        stats.put("cancelled", all.stream().filter(a -> "CANCELLED".equalsIgnoreCase(a.getStatus())).count());
        stats.put("video", all.stream().filter(a -> "VIDEO".equalsIgnoreCase(a.getAppointmentType())).count());
        return ResponseEntity.ok(stats);
    }

    /** Inventory alerts: low stock + expiring */
    @GetMapping("/inventory-alerts")
    public ResponseEntity<Map<String, Object>> getInventoryAlerts() {
        List<Inventory> all = inventoryRepository.findAll();
        Map<String, Object> alerts = new LinkedHashMap<>();
        List<Inventory> lowStock = all.stream()
                .filter(i -> i.getQuantity() != null && i.getReorderLevel() != null
                        && i.getQuantity() <= i.getReorderLevel())
                .collect(Collectors.toList());
        alerts.put("lowStockCount", lowStock.size());
        alerts.put("lowStockItems", lowStock);
        alerts.put("totalItems", all.size());
        return ResponseEntity.ok(alerts);
    }

    /** Lab report stats */
    @GetMapping("/lab-stats")
    public ResponseEntity<Map<String, Object>> getLabStats() {
        List<LabReport> all = labReportRepository.findAll();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", all.size());
        stats.put("pending", all.stream().filter(r -> "PENDING".equalsIgnoreCase(r.getResult()) || r.getResult() == null).count());
        stats.put("abnormal", all.stream().filter(r -> r.getResult() != null && r.getResult().toUpperCase().contains("ABNORMAL")).count());
        return ResponseEntity.ok(stats);
    }

    /** Doctor availability grid */
    @GetMapping("/doctor-availability")
    public ResponseEntity<List<Map<String, Object>>> getDoctorAvailability() {
        List<Doctor> doctors = doctorRepository.findAll();
        List<Map<String, Object>> result = doctors.stream().map(d -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("doctorId", d.getDoctorId());
            row.put("name", d.getUser() != null ? d.getUser().getName() : "Unknown");
            row.put("specialization", d.getSpecialization());
            row.put("hospital", d.getHospital() != null ? d.getHospital().getHospitalName() : "");
            row.put("status", d.getAvailabilityStatus() != null ? d.getAvailabilityStatus() : "OFFLINE");
            return row;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /** Video appointments (telemedicine) */
    @GetMapping("/video-appointments")
    public ResponseEntity<List<Appointment>> getVideoAppointments() {
        List<Appointment> videoAppts = appointmentRepository.findAll().stream()
                .filter(a -> "VIDEO".equalsIgnoreCase(a.getAppointmentType()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(videoAppts);
    }
}
