package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Appointment;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.DoctorRepository;
import com.cts.mfrp.repository.PatientRepository;
import com.cts.mfrp.repository.UserRepository;
import com.cts.mfrp.service.AppointmentService;
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
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {
    private final AppointmentService appointmentService;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    /** Role-scoped: PATIENT → own, DOCTOR → own, ADMIN → all. */
    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        User caller = getCaller();
        String role = caller.getRole();
        if ("PATIENT".equalsIgnoreCase(role)) {
            return patientRepository.findByUserUserId(caller.getUserId())
                    .map(p -> ResponseEntity.ok(appointmentService.getAppointmentsByPatient(p.getPatientId())))
                    .orElse(ResponseEntity.ok(List.of()));
        }
        if ("DOCTOR".equalsIgnoreCase(role)) {
            return doctorRepository.findByUserEmail(caller.getEmail())
                    .map(d -> ResponseEntity.ok(appointmentService.getAppointmentsByDoctor(d.getDoctorId())))
                    .orElse(ResponseEntity.ok(List.of()));
        }
        return ResponseEntity.ok(appointmentService.getAllAppointments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable Integer id) {
        return ResponseEntity.ok(appointmentService.getAppointmentById(id));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByPatient(@PathVariable Integer patientId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByPatient(patientId));
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Appointment>> getAppointmentsByDoctor(@PathVariable Integer doctorId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByDoctor(doctorId));
    }

    /** Create appointment and notify admin + doctor. */
    @PostMapping
    public ResponseEntity<Appointment> createAppointment(@Valid @RequestBody Appointment appointment) {
        return ResponseEntity.ok(appointmentService.createAppointment(appointment));
    }

    /** Update appointment; detects status change and notifies relevant parties. */
    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateAppointment(@PathVariable Integer id,
                                                          @Valid @RequestBody Appointment appointment) {
        return ResponseEntity.ok(appointmentService.updateAppointment(id, appointment));
    }

    /** Delete appointment — PATIENT can only delete their own; ADMIN/DOCTOR can delete any. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable Integer id) {
        User caller = getCaller();
        Appointment appt = appointmentService.getAppointmentById(id);
        if ("PATIENT".equalsIgnoreCase(caller.getRole())) {
            boolean owns = appt.getPatient() != null
                    && appt.getPatient().getUser() != null
                    && appt.getPatient().getUser().getUserId().equals(caller.getUserId());
            if (!owns) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not authorised to cancel this appointment");
            }
        }
        appointmentService.deleteAppointment(id);
        return ResponseEntity.noContent().build();
    }

    private User getCaller() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
