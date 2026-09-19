package com.dearlove.controller;

import com.dearlove.dto.ProfileResponse;
import com.dearlove.dto.SetPartnerRequest;
import com.dearlove.service.AuthService;
import com.dearlove.service.ProfileService;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final AuthService authService;

    public ProfileController(ProfileService profileService, AuthService authService) {
        this.profileService = profileService;
        this.authService = authService;
    }

    @GetMapping
    public ProfileResponse get(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        return profileService.getProfile(authService.requireUsername(authorization));
    }

    @PostMapping("/partner")
    public ProfileResponse setPartner(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody SetPartnerRequest req) {
        return profileService.setPartner(authService.requireUsername(authorization), req);
    }

    @DeleteMapping("/partner")
    public ProfileResponse removePartner(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        return profileService.removePartner(authService.requireUsername(authorization));
    }
}
