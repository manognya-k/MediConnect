package com.cts.mfrp.repository;

import com.cts.mfrp.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Integer> {
    List<MedicalRecord> findByPatientPatientId(Integer patientId);
    List<MedicalRecord> findByDoctorDoctorId(Integer doctorId);
}
