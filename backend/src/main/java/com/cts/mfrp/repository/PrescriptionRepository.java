package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Integer> {
    List<Prescription> findByPatientPatientIdOrderByCreatedAtDesc(Integer patientId);
    List<Prescription> findByDoctorDoctorIdOrderByCreatedAtDesc(Integer doctorId);
    List<Prescription> findByMedicalRecordRecordId(Integer recordId);
}
