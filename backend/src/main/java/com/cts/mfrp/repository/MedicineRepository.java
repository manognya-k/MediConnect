package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicineRepository extends JpaRepository<Medicine, Integer> {
    List<Medicine> findByPatientPatientIdOrderByCreatedAtDesc(Integer patientId);
}
