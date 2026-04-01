package com.cts.mfrp.service;

import com.cts.mfrp.entity.Hospital;
import com.cts.mfrp.repository.HospitalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HospitalService {
    private final HospitalRepository hospitalRepository;

    public List<Hospital> getAllHospitals() {
        return hospitalRepository.findAll();
    }

    public Hospital getHospitalById(Integer id) {
        return hospitalRepository.findById(id).orElse(null);
    }

    public Hospital saveHospital(Hospital hospital) {
        return hospitalRepository.save(hospital);
    }

    public void deleteHospital(Integer id) {
        hospitalRepository.deleteById(id);
    }
}

