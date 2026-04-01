package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Integer> {
    List<Appointment> findByPatientPatientId(Integer patientId);
    List<Appointment> findByDoctorDoctorId(Integer doctorId);
    List<Appointment> findByAppointmentDate(LocalDate date);
    List<Appointment> findByStatus(String status);
}
