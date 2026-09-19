package com.dearlove.dto;

import java.time.LocalDate;

public record ProfileResponse(
        String username,
        String partnerUsername,
        LocalDate relationshipStartDate,
        Long daysTogether
) {
}
