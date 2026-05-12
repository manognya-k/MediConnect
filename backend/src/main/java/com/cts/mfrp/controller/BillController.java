package com.cts.mfrp.controller;

import com.cts.mfrp.entity.Bill;
import com.cts.mfrp.repository.BillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Manual billing endpoints. Bills are no longer auto-created with appointments —
 * the admin creates / edits / marks them paid through this controller.
 */
@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillRepository billRepository;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Bill>> getAll() {
        return ResponseEntity.ok(billRepository.findAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','PATIENT')")
    public ResponseEntity<Bill> getById(@PathVariable Long id) {
        return ResponseEntity.ok(billRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found")));
    }

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN','DOCTOR','PATIENT')")
    public ResponseEntity<List<Bill>> getByPatient(@PathVariable Integer patientId) {
        return ResponseEntity.ok(billRepository.findByPatientPatientId(patientId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Bill> create(@RequestBody Bill bill) {
        if (bill.getStatus() == null || bill.getStatus().isBlank()) bill.setStatus("PENDING");
        return ResponseEntity.status(HttpStatus.CREATED).body(billRepository.save(bill));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Bill> update(@PathVariable Long id, @RequestBody Bill bill) {
        billRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found"));
        bill.setId(id);
        return ResponseEntity.ok(billRepository.save(bill));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!billRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Bill not found");
        }
        billRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
