package com.dearlove.dto;

import java.time.LocalDateTime;

public record LetterSummaryResponse(
        String id,
        String title,
        double lat,
        double lng,
        int radius,
        String placeLabel,
        LocalDateTime createdAt,
        boolean unlocked,
        double distance
) {
}
