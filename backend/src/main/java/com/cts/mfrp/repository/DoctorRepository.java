package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Integer> {
    List<Doctor> findByHospitalHospitalId(Integer hospitalId);
    List<Doctor> findByDepartmentDepartmentId(Integer departmentId);
    List<Doctor> findBySpecialization(String specialization);
    List<Doctor> findByAvailabilityStatus(String status);
}
