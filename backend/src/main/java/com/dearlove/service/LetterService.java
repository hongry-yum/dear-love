package com.dearlove.service;

import com.dearlove.dto.*;
import com.dearlove.mapper.LetterMapper;
import com.dearlove.model.Letter;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.UUID;

@Service
public class LetterService {

    private static final int LIST_LIMIT = 500;
    private static final int TITLE_MAX_LEN = 80;
    private static final int BODY_MAX_LEN = 2000;
    private static final int PLACE_LABEL_MAX_LEN = 200;

    private final LetterMapper letterMapper;

    public LetterService(LetterMapper letterMapper) {
        this.letterMapper = letterMapper;
    }

    public CreateLetterResponse createLetter(CreateLetterRequest req, String username) {
        String body = req.body() == null ? "" : req.body().trim();
        if (body.isEmpty() || req.lat() == null || req.lng() == null || req.radius() == null || req.radius() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title/body/lat/lng/radius가 올바르지 않아요.");
        }
        if (req.lat() < -90 || req.lat() > 90 || req.lng() < -180 || req.lng() > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "좌표 범위가 올바르지 않아요.");
        }

        Letter letter = new Letter();
        letter.setId(UUID.randomUUID().toString());
        letter.setTitle(truncate(req.title(), TITLE_MAX_LEN));
        letter.setBody(truncate(body, BODY_MAX_LEN));
        letter.setLat(req.lat());
        letter.setLng(req.lng());
        letter.setRadius(req.radius());
        letter.setPlaceLabel(truncate(req.placeLabel(), PLACE_LABEL_MAX_LEN));
        letter.setOwnerToken(UUID.randomUUID().toString());
        letter.setUsername(username);

        letterMapper.insert(letter);
        return new CreateLetterResponse(letter.getId(), letter.getOwnerToken());
    }

    public LetterListResponse listLetters(double lat, double lng) {
        List<Letter> rows = letterMapper.findRecent(LIST_LIMIT);
        List<LetterSummaryResponse> letters = rows.stream()
                .map(r -> {
                    double distance = haversineMeters(lat, lng, r.getLat(), r.getLng());
                    return new LetterSummaryResponse(
                            r.getId(), r.getTitle(), r.getLat(), r.getLng(), r.getRadius(),
                            r.getPlaceLabel(), r.getUsername(), r.getCreatedAt(), distance <= r.getRadius(), distance
                    );
                })
                .toList();
        return new LetterListResponse(letters);
    }

    public LetterDetailResponse getLetter(String id, double lat, double lng) {
        Letter r = letterMapper.findById(id);
        if (r == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "편지를 찾을 수 없어요.");
        }
        double distance = haversineMeters(lat, lng, r.getLat(), r.getLng());
        boolean unlocked = distance <= r.getRadius();
        String body = unlocked ? r.getBody() : null;
        return new LetterDetailResponse(r.getId(), r.getTitle(), body, r.getPlaceLabel(), r.getUsername(), r.getRadius(), r.getCreatedAt(), unlocked, distance);
    }

    /**
     * Deletes a letter if the caller proves ownership either way: a logged-in
     * username matching the letter's author, or (for letters written before
     * accounts existed) the anonymous ownerToken issued at creation time.
     */
    public DeleteResponse deleteLetter(String id, String requestingUsername, String ownerToken) {
        int affected = 0;
        if (requestingUsername != null) {
            affected = letterMapper.deleteByIdAndUsername(id, requestingUsername);
        }
        if (affected == 0 && ownerToken != null && !ownerToken.isBlank()) {
            affected = letterMapper.deleteByIdAndOwnerToken(id, ownerToken);
        }
        if (affected == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "삭제 권한이 없거나 편지를 찾을 수 없어요.");
        }
        return new DeleteResponse(true);
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        String trimmed = s.trim();
        if (trimmed.isEmpty()) return null;
        return trimmed.length() > maxLen ? trimmed.substring(0, maxLen) : trimmed;
    }

    static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * R * Math.asin(Math.sqrt(a));
    }
}
