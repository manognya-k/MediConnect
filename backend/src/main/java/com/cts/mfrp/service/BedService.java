package com.cts.mfrp.service;

import com.cts.mfrp.entity.Bed;
import com.cts.mfrp.repository.BedRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BedService {
    private final BedRepository bedRepository;

    public List<Bed> getAllBeds() {
        return bedRepository.findAll();
    }

    public Bed getBedById(Integer id) {
        return bedRepository.findById(id).orElse(null);
    }

    public List<Bed> getBedsByHospital(Integer hospitalId) {
        return bedRepository.findByHospitalHospitalId(hospitalId);
    }

    public List<Bed> getBedsByStatus(String status) {
        return bedRepository.findByStatus(status);
    }

    public Bed saveBed(Bed bed) {
        return bedRepository.save(bed);
    }

    public void deleteBed(Integer id) {
        bedRepository.deleteById(id);
    }
}
