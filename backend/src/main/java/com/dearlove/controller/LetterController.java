package com.dearlove.controller;

import com.dearlove.dto.*;
import com.dearlove.service.AuthService;
import com.dearlove.service.LetterService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/letters")
public class LetterController {

    private final LetterService letterService;
    private final AuthService authService;

    public LetterController(LetterService letterService, AuthService authService) {
        this.letterService = letterService;
        this.authService = authService;
    }

    @PostMapping
    public ResponseEntity<CreateLetterResponse> create(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody CreateLetterRequest req) {
        String username = authService.requireUsername(authorization);
        return ResponseEntity.status(HttpStatus.CREATED).body(letterService.createLetter(req, username));
    }

    @GetMapping
    public LetterListResponse list(@RequestParam(required = false) Double lat, @RequestParam(required = false) Double lng) {
        requireCoords(lat, lng);
        return letterService.listLetters(lat, lng);
    }

    @GetMapping("/{id}")
    public LetterDetailResponse get(@PathVariable String id,
                                     @RequestParam(required = false) Double lat,
                                     @RequestParam(required = false) Double lng) {
        requireCoords(lat, lng);
        return letterService.getLetter(id, lat, lng);
    }

    @DeleteMapping("/{id}")
    public DeleteResponse delete(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @PathVariable String id,
            @RequestBody(required = false) DeleteLetterRequest req) {
        String username = authService.resolveUsername(authorization);
        String ownerToken = req == null ? null : req.ownerToken();
        return letterService.deleteLetter(id, username, ownerToken);
    }

    private static void requireCoords(Double lat, Double lng) {
        if (lat == null || lng == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "lat/lng 쿼리 파라미터가 필요해요.");
        }
    }
}
