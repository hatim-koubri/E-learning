import 'dart:convert';

import 'package:elearning_mobile/src/api_client.dart';
import 'package:elearning_mobile/src/session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'test_support.dart';

void main() {
  group('Session et erreurs HTTP', () {
    test('un stockage de token inutilisable revient à la connexion', () async {
      final session = SessionController(UnreadableTokenStore());

      expect(await session.loadStoredToken(), isFalse);
      expect(session.status, SessionStatus.unauthenticated);
      expect(session.token, isNull);
    });

    test('un HTTP 401 supprime et réinitialise la session', () async {
      final store = MemoryTokenStore('token-valide');
      final session = SessionController(store);
      expect(await session.loadStoredToken(), isTrue);
      session.completeRestoration();
      final api = ApiClient(
        baseUrl: 'https://api.test',
        session: session,
        network: FixedNetworkMonitor(true),
        httpClient: MockClient((_) async => http.Response('', 401)),
      );

      await expectLater(
        api.call('/participant/formations'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.kind,
            'kind',
            ApiErrorKind.unauthorized,
          ),
        ),
      );
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);

      expect(store.value, isNull);
      expect(store.deletes, 1);
      expect(session.status, SessionStatus.unauthenticated);
      expect(session.message, 'Votre session a expiré.');
    });

    test(
      'plusieurs HTTP 401 simultanés ne déclenchent qu’une expiration',
      () async {
        final store = MemoryTokenStore('token-valide');
        final session = SessionController(store);
        await session.loadStoredToken();
        session.completeRestoration();
        final api = ApiClient(
          baseUrl: 'https://api.test',
          session: session,
          network: FixedNetworkMonitor(true),
          httpClient: MockClient((_) async => http.Response('', 401)),
        );

        await Future.wait([
          api.call('/participant/a').catchError((_) => null),
          api.call('/participant/b').catchError((_) => null),
        ]);
        await Future<void>.delayed(Duration.zero);
        await Future<void>.delayed(Duration.zero);

        expect(store.deletes, 1);
        expect(session.status, SessionStatus.unauthenticated);
      },
    );

    test('un HTTP 403 conserve le JWT et la session', () async {
      final store = MemoryTokenStore('token-valide');
      final session = SessionController(store);
      await session.loadStoredToken();
      session.completeRestoration();
      final api = ApiClient(
        baseUrl: 'https://api.test',
        session: session,
        network: FixedNetworkMonitor(true),
        httpClient: MockClient(
          (_) async =>
              http.Response(jsonEncode({'message': 'Acces refuse.'}), 403),
        ),
      );

      await expectLater(
        api.call('/participant/interdit'),
        throwsA(
          isA<ApiException>().having(
            (e) => e.kind,
            'kind',
            ApiErrorKind.forbidden,
          ),
        ),
      );

      expect(store.value, 'token-valide');
      expect(store.deletes, 0);
      expect(session.status, SessionStatus.authenticated);
    });

    test(
      'un réseau indisponible produit une erreur dédiée sans requête HTTP',
      () async {
        var requests = 0;
        final store = MemoryTokenStore('token-valide');
        final session = SessionController(store);
        await session.loadStoredToken();
        session.completeRestoration();
        final api = ApiClient(
          baseUrl: 'https://api.test',
          session: session,
          network: FixedNetworkMonitor(false),
          httpClient: MockClient((_) async {
            requests++;
            return http.Response('', 200);
          }),
        );

        await expectLater(
          api.call('/participant/formations'),
          throwsA(
            isA<ApiException>().having(
              (e) => e.kind,
              'kind',
              ApiErrorKind.network,
            ),
          ),
        );
        expect(requests, 0);
        expect(session.status, SessionStatus.authenticated);
      },
    );
  });
}
