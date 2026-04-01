package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BedRepository extends JpaRepository<Bed, Integer> {
    List<Bed> findByHospitalHospitalId(Integer hospitalId);
    List<Bed> findByStatus(String status);
}
