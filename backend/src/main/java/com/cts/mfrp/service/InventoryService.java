package com.cts.mfrp.service;

import com.cts.mfrp.entity.Inventory;
import com.cts.mfrp.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InventoryService {
    private final InventoryRepository inventoryRepository;

    public List<Inventory> getAllInventory() {
        return inventoryRepository.findAll();
    }

    public List<Inventory> getInventoryByHospital(Integer hospitalId) {
        return inventoryRepository.findByHospitalHospitalId(hospitalId);
    }

    public Inventory saveInventory(Inventory inventory) {
        return inventoryRepository.save(inventory);
    }

    public void deleteInventory(Integer id) {
        inventoryRepository.deleteById(id);
    }
}
