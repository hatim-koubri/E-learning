package ma.elearning.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
import ma.elearning.common.ApiExceptionHandler.ApiError;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.*;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.*;
import java.util.List;
import java.util.Map;
import java.time.Instant;
import java.io.IOException;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
    private static final RequestMatcher COOKIE_CREDENTIAL_CSRF = request ->
            isUnsafe(request.getMethod()) && hasCookies(request.getCookies());
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }
    @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origin}") String origin) {
        var c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(origin.isBlank() ? "http://localhost:3000" : origin));
        c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization","Content-Type","Idempotency-Key","X-Orientation-Session"));
        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }
    @Bean SecurityFilterChain chain(HttpSecurity http, JwtAuthenticationFilter jwt,
                                    CorsConfigurationSource corsConfigurationSource,
                                    ObjectMapper json) throws Exception {
        return http.csrf(csrf -> csrf.requireCsrfProtectionMatcher(COOKIE_CREDENTIAL_CSRF))
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req,res,ex) -> writeError(json,req,res,
                                HttpStatus.UNAUTHORIZED,"UNAUTHORIZED","Authentification requise ou session expirée."))
                        .accessDeniedHandler((req,res,ex) -> writeError(json,req,res,
                                HttpStatus.FORBIDDEN,"FORBIDDEN","Vous n’avez pas l’autorisation d’accéder à cette ressource.")))
                .authorizeHttpRequests(a -> a
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/api/auth/register/**","/api/auth/login",
                                "/api/auth/forgot-password","/api/auth/reset-password",
                                "/api/catalogue/**",
                                "/api/orientation/**","/api/formateurs/**",
                                "/error",
                                "/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/formateur/**").hasRole("FORMATEUR")
                        .requestMatchers("/api/participant/**").hasRole("PARTICIPANT")
                        .anyRequest().authenticated())
                .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class).build();
    }
    private static boolean isUnsafe(String method) {
        return !List.of("GET", "HEAD", "TRACE", "OPTIONS").contains(method);
    }
    private static boolean hasCookies(Cookie[] cookies) {
        return cookies != null && cookies.length > 0;
    }
    private static void writeError(ObjectMapper json, HttpServletRequest request,
                                   HttpServletResponse response, HttpStatus status,
                                   String code, String message) throws IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        json.writeValue(response.getOutputStream(),new ApiError(Instant.now(),status.value(),code,
                message,request.getRequestURI(),Map.of()));
    }
}
