package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventoryRepository extends JpaRepository<Inventory, Integer> {
    List<Inventory> findByHospitalHospitalId(Integer hospitalId);
}
