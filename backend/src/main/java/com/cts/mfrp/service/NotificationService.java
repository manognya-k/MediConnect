package com.cts.mfrp.service;

import com.cts.mfrp.entity.Notification;
import com.cts.mfrp.entity.User;
import com.cts.mfrp.repository.NotificationRepository;
import com.cts.mfrp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final WebSocketEventPublisher wsPublisher;

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

    public Notification getById(Integer id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
    }

    public void markAsRead(Integer id) {
        Notification n = getById(id);
        n.setIsRead(true);
        notificationRepository.save(n);
    }

    public void markAllAsRead(Integer userId) {
        List<Notification> unread = notificationRepository.findByUserUserIdAndIsRead(userId, false);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    /** Create a notification, persist it, and push via WebSocket. */
    public Notification createNotification(Integer userId, String type, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Notification n = new Notification();
        n.setUser(user);
        n.setNotificationType(type);
        n.setMessage(message);
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());
        Notification saved = notificationRepository.save(n);

        wsPublisher.publishToUser(userId, "notification-created",
                java.util.Map.of(
                        "id", saved.getNotificationId(),
                        "type", type,
                        "message", message,
                        "createdAt", saved.getCreatedAt().toString()
                ));
        return saved;
    }
}
