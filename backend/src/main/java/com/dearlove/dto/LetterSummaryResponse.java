package com.dearlove.dto;

import java.time.LocalDateTime;

public record LetterSummaryResponse(
        String id,
        String title,
        double lat,
        double lng,
        int radius,
        String placeLabel,
        String authorUsername,
        LocalDateTime createdAt,
        boolean unlocked,
        double distance
) {
}
