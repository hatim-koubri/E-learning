package ma.elearning.orientation;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.elearning.common.BusinessException;
import ma.elearning.formation.FormationRepository;
import ma.elearning.orientation.OrientationDtos.CreateConversationRequest;
import ma.elearning.orientation.OrientationDtos.SendMessageRequest;
import ma.elearning.orientation.ollama.OllamaClient;
import ma.elearning.orientation.ollama.OllamaProperties;
import ma.elearning.user.AccountStatus;
import ma.elearning.user.Participant;
import ma.elearning.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OrientationServiceTest {
    private final OrientationConversationRepository conversations = mock(OrientationConversationRepository.class);
    private final OrientationMessageRepository messages = mock(OrientationMessageRepository.class);
    private final OrientationRecommendationRepository recommendations = mock(OrientationRecommendationRepository.class);
    private final FormationRepository formations = mock(FormationRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final OllamaClient ollama = mock(OllamaClient.class);
    private final OrientationPromptService prompts = mock(OrientationPromptService.class);
    private final ParticipantProfileExtractor extractor = mock(ParticipantProfileExtractor.class);
    private final RecommendationScoringService scoring = mock(RecommendationScoringService.class);
    private final OrientationRateLimitService limits = mock(OrientationRateLimitService.class);
    private OrientationService service;

    @BeforeEach
    void setUp() {
        service = new OrientationService(conversations, messages, recommendations, formations, users,
                ollama, prompts, extractor, scoring, limits, new ObjectMapper());
        when(messages.findByConversationIdOrderByCreatedAtAscIdAsc(any())).thenReturn(List.of());
        when(recommendations.findByConversationIdOrderByRangAsc(any())).thenReturn(List.of());
        when(conversations.save(any())).thenAnswer(invocation -> {
            OrientationConversation value = invocation.getArgument(0);
            ReflectionTestUtils.setField(value, "id", 7L);
            return value;
        });
    }

    @Test
    void createsAnAnonymousConversationWithAValidatedSession() {
        var response = service.create(new CreateConversationRequest("visitor_session_123456"), null);
        assertEquals(7L, response.id());
        assertEquals("visitor_session_123456", response.sessionId());
        assertNull(response.profil().objectif());
    }

    @Test
    void rejectsAnInvalidAnonymousSessionWhenLoading() {
        BusinessException failure = assertThrows(BusinessException.class,
                () -> service.get(7L, "short", null));
        assertEquals("CONVERSATION_NOT_FOUND", failure.getCode());
        verifyNoInteractions(conversations);
    }

    @Test
    void listsOnlyTheAuthenticatedParticipantsConversations() {
        Participant participant = participant();
        Authentication auth = authentication();
        when(users.findByEmail("participant@test.local")).thenReturn(Optional.of(participant));
        OrientationConversation conversation = conversation();
        when(conversations.findByParticipantEmailOrderByUpdatedAtDesc(participant.getEmail())).thenReturn(List.of(conversation));

        var result = service.list(auth);

        assertEquals(1, result.size());
        assertEquals("Nouvelle orientation", result.getFirst().titre());
    }

    @Test
    void answersClearlyOffTopicMessagesWithoutCallingTheModel() {
        OrientationConversation conversation = conversation();
        when(conversations.findByIdAndParticipantIsNullAndSessionId(7L, "visitor_session_123456"))
                .thenReturn(Optional.of(conversation));
        when(conversations.findLocked(7L)).thenReturn(Optional.of(conversation));
        when(messages.findByConversationIdAndRequestId(7L, "request_1234")).thenReturn(Optional.empty());
        when(messages.recent(any(), any())).thenReturn(List.of());
        OllamaProperties properties = new OllamaProperties();
        properties.setModel("local-test-model");
        when(ollama.properties()).thenReturn(properties);

        var response = service.send(7L, "visitor_session_123456", null,
                new SendMessageRequest("Quel temps fera-t-il demain ?", "request_1234"));

        assertTrue(response.message().contenu().contains("orientation"));
        verifyNoMoreInteractions(prompts);
        verify(messages).saveAndFlush(any(OrientationMessage.class));
        verify(messages).save(any(OrientationMessage.class));
    }

    private OrientationConversation conversation() {
        OrientationConversation value = new OrientationConversation();
        ReflectionTestUtils.setField(value, "id", 7L);
        value.setSessionId("visitor_session_123456");
        return value;
    }

    private Participant participant() {
        Participant value = new Participant();
        value.setEmail("participant@test.local");
        value.setStatut(AccountStatus.ACTIF);
        return value;
    }

    private Authentication authentication() {
        Authentication value = mock(Authentication.class);
        when(value.isAuthenticated()).thenReturn(true);
        when(value.getPrincipal()).thenReturn("participant@test.local");
        when(value.getName()).thenReturn("participant@test.local");
        return value;
    }
}
