package com.cts.mfrp.service;

import com.cts.mfrp.entity.Notification;
import com.cts.mfrp.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;

    public List<Notification> getNotificationsByUser(Integer userId) {
        return notificationRepository.findByUserUserId(userId);
    }

    public List<Notification> getUnreadNotifications(Integer userId) {
        return notificationRepository.findByUserUserIdAndIsRead(userId, false);
    }

    public Notification saveNotification(Notification notification) {
        return notificationRepository.save(notification);
    }

    public void deleteNotification(Integer id) {
        notificationRepository.deleteById(id);
    }
}
