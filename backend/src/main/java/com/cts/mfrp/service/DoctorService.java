package com.cts.mfrp.service;

import com.cts.mfrp.entity.Appointment;
import com.cts.mfrp.entity.Doctor;
import com.cts.mfrp.entity.Patient;
import com.cts.mfrp.repository.AppointmentRepository;
import com.cts.mfrp.repository.DoctorRepository;
import com.cts.mfrp.repository.MedicalRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DoctorService {
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;

    public List<Doctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    public Doctor getDoctorById(Integer id) {
        return doctorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
    }

    public List<Doctor> getDoctorsByHospital(Integer hospitalId) {
        return doctorRepository.findByHospitalHospitalId(hospitalId);
    }

    public List<Doctor> getDoctorsBySpecialization(String specialization) {
        return doctorRepository.findBySpecialization(specialization);
    }

    public Doctor saveDoctor(Doctor doctor) {
        return doctorRepository.save(doctor);
    }

    public Doctor updateAvailabilityStatus(Integer doctorId, String status) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
        doctor.setAvailabilityStatus(status);
        return doctorRepository.save(doctor);
    }

    /** Returns doctors with matching specialization who have no conflicting appointment at the given date/time. */
    public List<Doctor> findAvailableDoctors(String specialization, LocalDate date, LocalTime time) {
        return doctorRepository.findBySpecialization(specialization).stream()
                .filter(d -> "AVAILABLE".equalsIgnoreCase(d.getAvailabilityStatus()))
                .filter(d -> appointmentRepository.findByDoctorDoctorId(d.getDoctorId()).stream()
                        .noneMatch(a -> date.equals(a.getAppointmentDate())
                                && time.equals(a.getAppointmentTime())
                                && !"CANCELLED".equalsIgnoreCase(a.getStatus())))
                .collect(Collectors.toList());
    }

    public void deleteDoctor(Integer id) {
        if (!doctorRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found");
        }
        doctorRepository.deleteById(id);
    }

    /**
     * Returns available 30-minute time slots for a doctor on a given date.
     * Standard working day: 09:00–17:00. Booked (non-CANCELLED) slots are excluded.
     */
    public List<String> getAvailableSlots(Integer doctorId, LocalDate date) {
        // Generate all 30-min slots from 09:00 to 16:30 inclusive
        List<LocalTime> allSlots = new ArrayList<>();
        LocalTime cursor = LocalTime.of(9, 0);
        LocalTime end    = LocalTime.of(17, 0);
        while (cursor.isBefore(end)) {
            allSlots.add(cursor);
            cursor = cursor.plusMinutes(30);
        }

        // Find already-booked times for this doctor on this date
        List<LocalTime> booked = appointmentRepository.findByDoctorDoctorId(doctorId).stream()
                .filter(a -> date.equals(a.getAppointmentDate())
                        && !"CANCELLED".equalsIgnoreCase(a.getStatus())
                        && a.getAppointmentTime() != null)
                .map(Appointment::getAppointmentTime)
                .collect(Collectors.toList());

        return allSlots.stream()
                .filter(slot -> !booked.contains(slot))
                .map(slot -> {
                    int h = slot.getHour();
                    int m = slot.getMinute();
                    String period = h >= 12 ? "PM" : "AM";
                    int displayH = h % 12 == 0 ? 12 : h % 12;
                    return displayH + ":" + (m == 0 ? "00" : m) + " " + period;
                })
                .collect(Collectors.toList());
    }

    /**
     * Returns distinct patients linked to this doctor via appointments OR medical records.
     * Enforces that only the doctor themselves (or an ADMIN) can call this.
     */
    public List<Patient> getPatientsForDoctor(Integer doctorId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!isAdmin) {
            String callerEmail = (String) auth.getPrincipal();
            Doctor callerDoctor = doctorRepository.findByUserEmail(callerEmail)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied"));
            if (!callerDoctor.getDoctorId().equals(doctorId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
            }
        }

        // Collect distinct patients — keyed by patientId to deduplicate
        Map<Integer, Patient> patientMap = new LinkedHashMap<>();

        appointmentRepository.findByDoctorDoctorId(doctorId).forEach(a -> {
            if (a.getPatient() != null)
                patientMap.put(a.getPatient().getPatientId(), a.getPatient());
        });

        medicalRecordRepository.findByDoctorDoctorId(doctorId).forEach(r -> {
            if (r.getPatient() != null)
                patientMap.put(r.getPatient().getPatientId(), r.getPatient());
        });

        return new ArrayList<>(patientMap.values());
    }
}
