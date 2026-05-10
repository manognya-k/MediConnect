package com.cts.mfrp.service;

import com.cts.mfrp.entity.Appointment;
import com.cts.mfrp.entity.Bill;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.AppointmentRepository;
import com.cts.mfrp.repository.BillRepository;
import com.cts.mfrp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentService {
    private final AppointmentRepository appointmentRepository;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final BillRepository billRepository;

    @Value("${mediconnect.billing.consult-fee:500}")
    private BigDecimal consultFee;

    @Value("${mediconnect.billing.video-consult-fee:700}")
    private BigDecimal videoConsultFee;

    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    public Appointment getAppointmentById(Integer id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
    }

    public List<Appointment> getAppointmentsByPatient(Integer patientId) {
        return appointmentRepository.findByPatientPatientId(patientId);
    }

    public List<Appointment> getAppointmentsByDoctor(Integer doctorId) {
        return appointmentRepository.findByDoctorDoctorId(doctorId);
    }

    public List<Appointment> getAppointmentsByDate(LocalDate date) {
        return appointmentRepository.findByAppointmentDate(date);
    }

    /** Create a new appointment and notify admin + assigned doctor. */
    @Transactional
    public Appointment createAppointment(Appointment appointment) {
        Appointment saved = appointmentRepository.save(appointment);

        // Auto-create bill for this appointment
        try {
            Bill bill = new Bill();
            bill.setAppointment(saved);
            bill.setPatient(saved.getPatient());
            boolean isVideo = "VIDEO".equalsIgnoreCase(saved.getAppointmentType());
            bill.setAmount(isVideo ? videoConsultFee : consultFee);
            bill.setType(isVideo ? "VIDEO_CONSULTATION" : "CONSULTATION");
            bill.setStatus("PENDING");
            bill.setBillDate(saved.getAppointmentDate() != null ? saved.getAppointmentDate() : LocalDate.now());
            billRepository.save(bill);
        } catch (Exception ignored) { }

        String patientName = saved.getPatient() != null && saved.getPatient().getUser() != null
                ? saved.getPatient().getUser().getName() : "A patient";
        String dateStr = saved.getAppointmentDate() != null ? saved.getAppointmentDate().toString() : "an upcoming date";

        String adminMsg = patientName + " booked an appointment for " + dateStr;
        userRepository.findAll().stream()
                .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                .forEach(admin -> notificationService.createNotification(
                        admin.getUserId(), "APPOINTMENT_BOOKED", adminMsg));

        if (saved.getDoctor() != null && saved.getDoctor().getUser() != null) {
            Integer doctorUserId = saved.getDoctor().getUser().getUserId();
            notificationService.createNotification(doctorUserId, "APPOINTMENT_BOOKED",
                    "New appointment with " + patientName + " on " + dateStr);
        }
        return saved;
    }

    /** Update an existing appointment; detect status change and notify relevant parties. */
    @Transactional
    public Appointment updateAppointment(Integer id, Appointment updated) {
        Appointment existing = getAppointmentById(id);
        String oldStatus = existing.getStatus();
        String newStatus = updated.getStatus();

        updated.setAppointmentId(id);

        // Generate session URL when a VIDEO appointment is confirmed
        if ("CONFIRMED".equals(newStatus) && "VIDEO".equalsIgnoreCase(updated.getAppointmentType())
                && (updated.getSessionUrl() == null || updated.getSessionUrl().isBlank())) {
            updated.setSessionUrl("https://meet.mediconnect.app/room/" + UUID.randomUUID());
        }

        Appointment saved = appointmentRepository.save(updated);

        String patientName = saved.getPatient() != null && saved.getPatient().getUser() != null
                ? saved.getPatient().getUser().getName() : "A patient";
        String dateStr = saved.getAppointmentDate() != null ? saved.getAppointmentDate().toString() : "";

        if ("CONFIRMED".equals(newStatus) && !"CONFIRMED".equals(oldStatus)) {
            if (saved.getPatient() != null && saved.getPatient().getUser() != null) {
                notificationService.createNotification(saved.getPatient().getUser().getUserId(),
                        "APPOINTMENT_CONFIRMED", "Your appointment on " + dateStr + " has been confirmed.");
            }
            if (saved.getDoctor() != null && saved.getDoctor().getUser() != null) {
                notificationService.createNotification(saved.getDoctor().getUser().getUserId(),
                        "APPOINTMENT_CONFIRMED", "Appointment with " + patientName + " on " + dateStr + " is confirmed.");
            }
        }

        if ("CANCELLED".equals(newStatus) && !"CANCELLED".equals(oldStatus)) {
            if (saved.getDoctor() != null && saved.getDoctor().getUser() != null) {
                notificationService.createNotification(saved.getDoctor().getUser().getUserId(),
                        "APPOINTMENT_CANCELLED", patientName + " cancelled the appointment on " + dateStr + ".");
            }
            userRepository.findAll().stream()
                    .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                    .forEach(admin -> notificationService.createNotification(
                            admin.getUserId(), "APPOINTMENT_CANCELLED",
                            patientName + " cancelled their appointment on " + dateStr + "."));
        }
        return saved;
    }

    /** Legacy passthrough — used by internal callers that don't need notifications. */
    public Appointment saveAppointment(Appointment appointment) {
        return appointmentRepository.save(appointment);
    }

    public void deleteAppointment(Integer id) {
        if (!appointmentRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found");
        }
        appointmentRepository.deleteById(id);
    }
}
