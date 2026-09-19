package com.dearlove.service;

import com.dearlove.dto.ProfileResponse;
import com.dearlove.dto.SetPartnerRequest;
import com.dearlove.mapper.UserMapper;
import com.dearlove.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Service
public class ProfileService {

    private final UserMapper userMapper;

    public ProfileService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public ProfileResponse getProfile(String username) {
        User user = userMapper.findByUsername(username);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없어요.");
        }
        return toResponse(user);
    }

    public ProfileResponse setPartner(String username, SetPartnerRequest req) {
        String partnerUsername = AuthService.normalizeUsername(req.partnerUsername());
        if (partnerUsername.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "연인의 아이디를 입력해주세요.");
        }
        if (partnerUsername.equals(username)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 자신을 연인으로 등록할 수 없어요.");
        }
        if (userMapper.findByUsername(partnerUsername) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 아이디예요.");
        }
        LocalDate startDate = req.relationshipStartDate();
        if (startDate == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "연애 시작일을 입력해주세요.");
        }
        if (startDate.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "연애 시작일은 오늘 이전이어야 해요.");
        }

        userMapper.updatePartner(username, partnerUsername, startDate);
        return getProfile(username);
    }

    public ProfileResponse removePartner(String username) {
        userMapper.clearPartner(username);
        return getProfile(username);
    }

    private ProfileResponse toResponse(User user) {
        Long daysTogether = null;
        if (user.getRelationshipStartDate() != null) {
            daysTogether = ChronoUnit.DAYS.between(user.getRelationshipStartDate(), LocalDate.now()) + 1;
        }
        return new ProfileResponse(user.getUsername(), user.getPartnerUsername(), user.getRelationshipStartDate(), daysTogether);
    }
}
