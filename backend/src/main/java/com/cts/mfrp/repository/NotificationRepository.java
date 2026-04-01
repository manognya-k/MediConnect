package com.cts.mfrp.repository;

import com.cts.mfrp.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUserUserId(Integer userId);
    List<Notification> findByUserUserIdAndIsRead(Integer userId, Boolean isRead);
}
