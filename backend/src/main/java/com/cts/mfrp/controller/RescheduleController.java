package com.cts.mfrp.controller;

import com.cts.mfrp.entity.RescheduleRequest;
import com.cts.mfrp.service.RescheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reschedule")
@RequiredArgsConstructor
public class RescheduleController {

    private final RescheduleService rescheduleService;

    /** Patient submits a reschedule request */
    @PostMapping("/request")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR','ADMIN')")
    public ResponseEntity<RescheduleRequest> createRequest(@RequestBody Map<String, Object> body) {
        Integer appointmentId = Integer.valueOf(body.get("appointmentId").toString());
        Integer patientId     = Integer.valueOf(body.get("patientId").toString());
        LocalDate date        = LocalDate.parse(body.get("requestedDate").toString());
        LocalTime time        = LocalTime.parse(body.get("requestedTime").toString());
        return ResponseEntity.ok(rescheduleService.createRequest(appointmentId, patientId, date, time));
    }

    /** Admin views all reschedule requests */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<RescheduleRequest>> getAllRequests() {
        return ResponseEntity.ok(rescheduleService.getAllRequests());
    }

    /** Admin forwards request to doctor */
    @PutMapping("/admin/forward/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RescheduleRequest> forwardRequest(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("adminNotes", "") : "";
        return ResponseEntity.ok(rescheduleService.forwardToDoctor(id, notes));
    }

    /** Doctor views forwarded requests */
    @GetMapping("/doctor/{doctorId}")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public ResponseEntity<List<RescheduleRequest>> getDoctorRequests(@PathVariable Integer doctorId) {
        return ResponseEntity.ok(rescheduleService.getDoctorRequests(doctorId));
    }

    /** Doctor approves reschedule */
    @PutMapping("/doctor/approve/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public ResponseEntity<RescheduleRequest> approveRequest(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("doctorNotes", "") : "";
        return ResponseEntity.ok(rescheduleService.approveRequest(id, notes));
    }

    /** Doctor rejects reschedule */
    @PutMapping("/doctor/reject/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public ResponseEntity<RescheduleRequest> rejectRequest(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("doctorNotes", "") : "";
        return ResponseEntity.ok(rescheduleService.rejectRequest(id, notes));
    }

    /** Admin rejects reschedule directly (separate actor, same logic). */
    @PutMapping("/admin/reject/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RescheduleRequest> adminRejectRequest(
            @PathVariable Integer id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("adminNotes", "") : "";
        return ResponseEntity.ok(rescheduleService.rejectRequest(id, notes));
    }
}
