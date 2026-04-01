package com.cts.mfrp.repository;

import com.cts.mfrp.entity.ChatbotLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatbotLogRepository extends JpaRepository<ChatbotLog, Integer> {
    List<ChatbotLog> findByUserUserId(Integer userId);
}
