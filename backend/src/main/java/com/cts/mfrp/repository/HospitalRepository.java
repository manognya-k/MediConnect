package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HospitalRepository extends JpaRepository<Hospital, Integer> {
    List<Hospital> findByCity(String city);
}
