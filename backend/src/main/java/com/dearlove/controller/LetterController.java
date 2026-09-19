package com.dearlove.controller;

import com.dearlove.dto.*;
import com.dearlove.service.LetterService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/letters")
public class LetterController {

    private final LetterService letterService;

    public LetterController(LetterService letterService) {
        this.letterService = letterService;
    }

    @PostMapping
    public ResponseEntity<CreateLetterResponse> create(@RequestBody CreateLetterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(letterService.createLetter(req));
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
    public DeleteResponse delete(@PathVariable String id, @RequestBody DeleteLetterRequest req) {
        return letterService.deleteLetter(id, req.ownerToken());
    }

    private static void requireCoords(Double lat, Double lng) {
        if (lat == null || lng == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "lat/lng 쿼리 파라미터가 필요해요.");
        }
    }
}
