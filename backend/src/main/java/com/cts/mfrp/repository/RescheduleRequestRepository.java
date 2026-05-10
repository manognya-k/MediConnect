package com.cts.mfrp.repository;

import com.cts.mfrp.entity.RescheduleRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RescheduleRequestRepository extends JpaRepository<RescheduleRequest, Integer> {
    List<RescheduleRequest> findByPatientPatientId(Integer patientId);
    List<RescheduleRequest> findByDoctorDoctorId(Integer doctorId);
    List<RescheduleRequest> findByStatus(String status);
    Optional<RescheduleRequest> findByAppointmentAppointmentIdAndStatusIn(Integer appointmentId, List<String> statuses);
}
