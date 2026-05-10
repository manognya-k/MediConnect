package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Integer> {
    Optional<Doctor> findByUserEmail(String email);
    List<Doctor> findByHospitalHospitalId(Integer hospitalId);
    List<Doctor> findByDepartmentDepartmentId(Integer departmentId);
    List<Doctor> findBySpecialization(String specialization);
    List<Doctor> findByAvailabilityStatus(String status);
}
