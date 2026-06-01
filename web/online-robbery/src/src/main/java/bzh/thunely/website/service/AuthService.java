package bzh.thunely.website.service;

import bzh.thunely.website.model.User;
import bzh.thunely.website.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository, JwtService jwtService, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public User getUserFromToken(String token) {
        if (token == null || !jwtService.validateToken(token)) return null;
        Long userId = jwtService.extractUserId(token);
        return userRepository.findById(userId).orElse(null);
    }

    public String authenticate(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                return jwtService.generateToken(user.getId());
            }
        }
        return null;
    }

    public String register(String username, String password) {
        if (userRepository.findByUsername(username).isPresent()) {
            return "Username already exists";
        }

        if (username.isEmpty() || password.isEmpty()) {
            return "Username and password cannot be empty";
        }

        User newUser = new User(username, passwordEncoder.encode(password), BigDecimal.ZERO);
        userRepository.save(newUser);
        return null; // Success
    }
}
