package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Integer> {
    Optional<Patient> findByUserUserId(Integer userId);
}
