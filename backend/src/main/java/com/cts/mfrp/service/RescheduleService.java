package com.cts.mfrp.service;

import com.cts.mfrp.entity.*;
import com.cts.mfrp.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RescheduleService {

    private final RescheduleRequestRepository rescheduleRepo;
    private final AppointmentRepository appointmentRepo;
    private final PatientRepository patientRepo;
    private final DoctorRepository doctorRepo;
    private final NotificationService notificationService;
    private final WebSocketEventPublisher wsPublisher;
    private final UserRepository userRepository;

    /** Patient submits a reschedule request. */
    @Transactional
    public RescheduleRequest createRequest(Integer appointmentId, Integer patientId,
                                           LocalDate requestedDate, LocalTime requestedTime) {
        // Block duplicate active requests for the same appointment
        rescheduleRepo.findByAppointmentAppointmentIdAndStatusIn(
                appointmentId, List.of("PENDING", "FORWARDED")
        ).ifPresent(r -> {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "An active reschedule request already exists for this appointment");
        });

        if (requestedDate.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested date cannot be in the past");
        }

        Appointment appointment = appointmentRepo.findById(appointmentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        Patient patient = patientRepo.findById(patientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Patient not found"));

        RescheduleRequest req = new RescheduleRequest();
        req.setAppointment(appointment);
        req.setPatient(patient);
        req.setDoctor(appointment.getDoctor());
        req.setRequestedDate(requestedDate);
        req.setRequestedTime(requestedTime);
        req.setStatus("PENDING");
        RescheduleRequest saved = rescheduleRepo.save(req);

        String patientName = patient.getUser() != null ? patient.getUser().getName() : "A patient";
        String notifMsg = patientName + " requested to reschedule appointment #"
                + appointmentId + " → " + requestedDate;

        // Notify every admin: persist in DB and push via WebSocket
        userRepository.findAll().stream()
                .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                .forEach(admin -> notificationService.createNotification(
                        admin.getUserId(), "RESCHEDULE_REQUEST", notifMsg));

        // Also notify the assigned doctor immediately
        Integer doctorUserId = req.getDoctor() != null && req.getDoctor().getUser() != null
                ? req.getDoctor().getUser().getUserId() : null;
        if (doctorUserId != null) {
            notificationService.createNotification(doctorUserId, "RESCHEDULE_REQUEST",
                    "Reschedule requested for your appointment #" + appointmentId
                            + " — new date: " + requestedDate);
        }

        wsPublisher.publishToAll("reschedule-status-updated",
                Map.of("event", "NEW_REQUEST", "requestId", saved.getId(), "patientId", patientId));
        return saved;
    }

    /** Admin views all reschedule requests. */
    public List<RescheduleRequest> getAllRequests() {
        return rescheduleRepo.findAll();
    }

    /** Admin forwards request to doctor. */
    @Transactional
    public RescheduleRequest forwardToDoctor(Integer requestId, String adminNotes) {
        RescheduleRequest req = findById(requestId);
        req.setStatus("FORWARDED");
        req.setAdminNotes(adminNotes);
        RescheduleRequest saved = rescheduleRepo.save(req);

        // Notify the doctor
        Integer doctorUserId = req.getDoctor() != null && req.getDoctor().getUser() != null
                ? req.getDoctor().getUser().getUserId() : null;
        if (doctorUserId != null) {
            notificationService.createNotification(doctorUserId,
                    "RESCHEDULE",
                    "Patient " + req.getPatient().getUser().getName() + " has requested a reschedule for " + req.getRequestedDate());
            wsPublisher.publishToUser(doctorUserId, "reschedule-status-updated",
                    Map.of("event", "FORWARDED", "requestId", requestId));
        }
        return saved;
    }

    /** Doctor approves reschedule — updates the actual appointment. */
    @Transactional
    public RescheduleRequest approveRequest(Integer requestId, String doctorNotes) {
        RescheduleRequest req = findById(requestId);
        req.setStatus("ACCEPTED");
        req.setDoctorNotes(doctorNotes);

        // Update the appointment date/time
        Appointment appt = req.getAppointment();
        appt.setAppointmentDate(req.getRequestedDate());
        appt.setAppointmentTime(req.getRequestedTime());
        appt.setStatus("CONFIRMED");
        appointmentRepo.save(appt);

        RescheduleRequest saved = rescheduleRepo.save(req);
        notifyPatient(req, "ACCEPTED", "Your reschedule request has been approved for " + req.getRequestedDate());
        return saved;
    }

    /** Doctor rejects reschedule. */
    @Transactional
    public RescheduleRequest rejectRequest(Integer requestId, String doctorNotes) {
        RescheduleRequest req = findById(requestId);
        req.setStatus("REJECTED");
        req.setDoctorNotes(doctorNotes);
        RescheduleRequest saved = rescheduleRepo.save(req);
        notifyPatient(req, "REJECTED", "Your reschedule request was declined by the doctor.");
        return saved;
    }

    public List<RescheduleRequest> getDoctorRequests(Integer doctorId) {
        return rescheduleRepo.findByDoctorDoctorId(doctorId);
    }

    private RescheduleRequest findById(Integer id) {
        return rescheduleRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reschedule request not found"));
    }

    private void notifyPatient(RescheduleRequest req, String event, String message) {
        Integer patientUserId = req.getPatient() != null && req.getPatient().getUser() != null
                ? req.getPatient().getUser().getUserId() : null;
        if (patientUserId != null) {
            notificationService.createNotification(patientUserId, "RESCHEDULE", message);
            wsPublisher.publishToUser(patientUserId, "reschedule-status-updated",
                    Map.of("event", event, "requestId", req.getId()));
        }
    }
}
