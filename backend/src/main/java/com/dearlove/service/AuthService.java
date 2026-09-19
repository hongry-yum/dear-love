package com.dearlove.service;

import com.dearlove.dto.AuthResponse;
import com.dearlove.dto.LoginRequest;
import com.dearlove.dto.SignupRequest;
import com.dearlove.mapper.SessionMapper;
import com.dearlove.mapper.UserMapper;
import com.dearlove.model.Session;
import com.dearlove.model.User;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-z0-9_]{3,20}$");
    private static final int SESSION_DAYS = 30;
    private static final String ADMIN_USERNAME = "admin";

    private final UserMapper userMapper;
    private final SessionMapper sessionMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserMapper userMapper, SessionMapper sessionMapper) {
        this.userMapper = userMapper;
        this.sessionMapper = sessionMapper;
    }

    public AuthResponse signup(SignupRequest req) {
        String username = normalizeUsername(req.username());
        String password = req.password() == null ? "" : req.password();

        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "아이디는 영문 소문자/숫자/밑줄로 3~20자여야 해요.");
        }
        if (password.length() < 4 || password.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 4자 이상이어야 해요.");
        }
        if (userMapper.findByUsername(username) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디예요.");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setAdmin(ADMIN_USERNAME.equals(username));
        try {
            userMapper.insert(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 아이디예요.");
        }

        return createSession(username);
    }

    public AuthResponse login(LoginRequest req) {
        String username = normalizeUsername(req.username());
        String password = req.password() == null ? "" : req.password();

        User user = userMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "아이디 또는 비밀번호가 올바르지 않아요.");
        }

        return createSession(username);
    }

    /** Returns the logged-in username for a valid bearer token, or null if absent/invalid/expired. */
    public String resolveUsername(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String token = authorizationHeader.substring("Bearer ".length()).trim();
        if (token.isEmpty()) return null;
        Session session = sessionMapper.findValidByToken(token);
        return session == null ? null : session.getUsername();
    }

    /** Same as resolveUsername, but throws 401 when there is no valid logged-in user. */
    public String requireUsername(String authorizationHeader) {
        String username = resolveUsername(authorizationHeader);
        if (username == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요해요.");
        }
        return username;
    }

    static String normalizeUsername(String raw) {
        return raw == null ? "" : raw.trim().toLowerCase();
    }

    private AuthResponse createSession(String username) {
        Session session = new Session();
        session.setToken(UUID.randomUUID().toString());
        session.setUsername(username);
        session.setExpiresAt(LocalDateTime.now().plusDays(SESSION_DAYS));
        sessionMapper.insert(session);
        return new AuthResponse(session.getToken(), username);
    }
}
