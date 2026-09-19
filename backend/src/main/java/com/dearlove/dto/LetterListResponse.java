package com.dearlove.dto;

import java.util.List;

public record LetterListResponse(List<LetterSummaryResponse> letters) {
}
