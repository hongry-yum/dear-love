package com.dearlove.dto;

public record CreateLetterRequest(
        String title, String body, Double lat, Double lng, Integer radius, String placeLabel, String recipientUsername
) {
}
