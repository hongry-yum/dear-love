package com.dearlove.dto;

import java.time.LocalDate;

public record SetPartnerRequest(String partnerUsername, LocalDate relationshipStartDate) {
}
