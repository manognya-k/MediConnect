package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    List<Department> findByHospitalHospitalId(Integer hospitalId);
}
