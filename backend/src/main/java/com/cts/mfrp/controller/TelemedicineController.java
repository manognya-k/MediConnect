package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Appointment;
import com.cts.mfrp.entity.VideoSession;
import com.cts.mfrp.repository.AppointmentRepository;
import com.cts.mfrp.repository.VideoSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/telemedicine")
@RequiredArgsConstructor
public class TelemedicineController {

    private final VideoSessionRepository videoSessionRepository;
    private final AppointmentRepository appointmentRepository;

    /**
     * Returns all completed/historical VIDEO appointment sessions.
     * Derives session records from the VideoSession table; falls back to
     * COMPLETED VIDEO appointments when no VideoSession records exist yet.
     */
    @GetMapping("/sessions")
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR')")
    public ResponseEntity<List<Map<String, Object>>> getSessions() {
        List<VideoSession> dbSessions = videoSessionRepository.findAll();

        if (!dbSessions.isEmpty()) {
            List<Map<String, Object>> result = dbSessions.stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .map(s -> {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("id",       s.getSessionCode());
                        row.put("doctor",   s.getDoctor() != null && s.getDoctor().getUser() != null
                                ? "Dr. " + s.getDoctor().getUser().getName() : "—");
                        row.put("patient",  s.getPatient() != null && s.getPatient().getUser() != null
                                ? s.getPatient().getUser().getName() : "—");
                        row.put("dept",     s.getDoctor() != null ? (s.getDoctor().getSpecialization() != null
                                ? s.getDoctor().getSpecialization() : "General") : "General");
                        row.put("duration", s.getDurationMinutes() != null
                                ? s.getDurationMinutes() + " min" : "—");
                        row.put("date",     s.getCreatedAt() != null ? s.getCreatedAt().toString() : "—");
                        row.put("status",   s.getStatus() != null ? s.getStatus().toLowerCase() : "completed");
                        return row;
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(result);
        }

        // Fallback: derive from COMPLETED VIDEO appointments
        List<Map<String, Object>> fallback = appointmentRepository.findAll().stream()
                .filter(a -> "VIDEO".equalsIgnoreCase(a.getAppointmentType()))
                .filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus())
                        || "CANCELLED".equalsIgnoreCase(a.getStatus()))
                .sorted((a, b) -> {
                    if (a.getAppointmentDate() == null) return 1;
                    if (b.getAppointmentDate() == null) return -1;
                    return b.getAppointmentDate().compareTo(a.getAppointmentDate());
                })
                .map(a -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id",       "VS-" + String.format("%04d", a.getAppointmentId()));
                    row.put("doctor",   a.getDoctor() != null && a.getDoctor().getUser() != null
                            ? "Dr. " + a.getDoctor().getUser().getName() : "—");
                    row.put("patient",  a.getPatient() != null && a.getPatient().getUser() != null
                            ? a.getPatient().getUser().getName() : "—");
                    row.put("dept",     a.getDoctor() != null && a.getDoctor().getSpecialization() != null
                            ? a.getDoctor().getSpecialization() : "General");
                    row.put("duration", "—");
                    row.put("date",     a.getAppointmentDate() != null ? a.getAppointmentDate().toString() : "—");
                    row.put("status",   "CANCELLED".equalsIgnoreCase(a.getStatus()) ? "missed" : "completed");
                    return row;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(fallback);
    }

    /**
     * Doctor marks a VIDEO session as complete. Creates a VideoSession record
     * and sets the appointment status to COMPLETED.
     */
    @PostMapping("/sessions/complete")
    @PreAuthorize("hasAnyRole('DOCTOR','ADMIN')")
    public ResponseEntity<Map<String, Object>> completeSession(@RequestBody Map<String, Object> body) {
        Integer appointmentId = Integer.valueOf(body.get("appointmentId").toString());
        Appointment appt = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));

        VideoSession vs = new VideoSession();
        vs.setSessionCode("VS-" + String.format("%04d", appointmentId));
        vs.setAppointment(appt);
        vs.setPatient(appt.getPatient());
        vs.setDoctor(appt.getDoctor());
        vs.setStartedAt(LocalDateTime.now().minusMinutes(30));
        vs.setEndedAt(LocalDateTime.now());
        vs.setDurationMinutes(body.containsKey("durationMinutes")
                ? Integer.valueOf(body.get("durationMinutes").toString()) : null);
        vs.setStatus("COMPLETED");
        videoSessionRepository.save(vs);

        appt.setStatus("COMPLETED");
        appointmentRepository.save(appt);

        return ResponseEntity.ok(Map.of("message", "Session completed", "sessionCode", vs.getSessionCode()));
    }
}
