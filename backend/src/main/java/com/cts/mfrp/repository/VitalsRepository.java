package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Vitals;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VitalsRepository extends JpaRepository<Vitals, Integer> {
    List<Vitals> findByPatientPatientIdOrderByUpdatedAtDesc(Integer patientId);
}
