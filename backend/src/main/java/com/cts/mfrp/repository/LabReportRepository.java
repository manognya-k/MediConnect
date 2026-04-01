package com.cts.mfrp.repository;

import com.cts.mfrp.entity.LabReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LabReportRepository extends JpaRepository<LabReport, Integer> {
    List<LabReport> findByPatientPatientId(Integer patientId);
    List<LabReport> findByDoctorDoctorId(Integer doctorId);
}
