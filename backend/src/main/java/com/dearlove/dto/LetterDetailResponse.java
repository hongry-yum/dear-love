package com.dearlove.dto;

import java.time.LocalDateTime;

public record LetterDetailResponse(
        String id,
        String title,
        String body,
        String placeLabel,
        String authorUsername,
        boolean isPrivate,
        Integer relationshipDay,
        int radius,
        LocalDateTime createdAt,
        boolean unlocked,
        String lockReason,
        double distance
) {
}
