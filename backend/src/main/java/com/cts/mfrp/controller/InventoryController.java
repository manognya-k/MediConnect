package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Inventory;
import com.cts.mfrp.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<Inventory>> getAllInventory() {
        return ResponseEntity.ok(inventoryService.getAllInventory());
    }

    @GetMapping("/hospital/{hospitalId}")
    public ResponseEntity<List<Inventory>> getInventoryByHospital(@PathVariable Integer hospitalId) {
        return ResponseEntity.ok(inventoryService.getInventoryByHospital(hospitalId));
    }

    @PostMapping
    public ResponseEntity<Inventory> createInventory(@RequestBody Inventory inventory) {
        return ResponseEntity.ok(inventoryService.saveInventory(inventory));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Inventory> updateInventory(@PathVariable Integer id, @RequestBody Inventory inventory) {
        inventory.setItemId(id);
        return ResponseEntity.ok(inventoryService.saveInventory(inventory));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInventory(@PathVariable Integer id) {
        inventoryService.deleteInventory(id);
        return ResponseEntity.noContent().build(); // FIXED: was ok()
    }
}
