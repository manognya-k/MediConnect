package com.cts.mfrp.service;

import com.cts.mfrp.entity.Appointment;
import com.cts.mfrp.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentService {
    private final AppointmentRepository appointmentRepository;
    
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }
    
    @SuppressWarnings("null")
    public Appointment getAppointmentById(Integer id) {
        return appointmentRepository.findById(id).orElse(null);
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
    
    @SuppressWarnings("null")
    public Appointment saveAppointment(Appointment appointment) {
        return appointmentRepository.save(appointment);
    }
    
    @SuppressWarnings("null")
    public void deleteAppointment(Integer id) {
        appointmentRepository.deleteById(id);
    }
}
