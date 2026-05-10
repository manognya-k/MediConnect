package com.cts.mfrp.repository;

import com.cts.mfrp.entity.VideoSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VideoSessionRepository extends JpaRepository<VideoSession, Long> {
    List<VideoSession> findByDoctorDoctorIdOrderByCreatedAtDesc(Integer doctorId);
    List<VideoSession> findByPatientPatientIdOrderByCreatedAtDesc(Integer patientId);
}
