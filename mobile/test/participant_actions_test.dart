import 'dart:async';
import 'dart:convert';

import 'package:elearning_mobile/src/api_client.dart';
import 'package:elearning_mobile/src/participant_actions.dart';
import 'package:elearning_mobile/src/session.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'test_support.dart';

Future<({ApiClient api, SessionController session})> authenticatedApi(
  MockClient client, {
  NetworkMonitor? network,
}) async {
  final session = SessionController(MemoryTokenStore('jwt-test'));
  await session.loadStoredToken();
  session.completeRestoration();
  return (
    api: ApiClient(
      baseUrl: 'https://api.test',
      session: session,
      httpClient: client,
      network: network ?? FixedNetworkMonitor(true),
    ),
    session: session,
  );
}

void main() {
  group('Progression explicite', () {
    test('protège la complétion lorsque les prérequis sont verrouillés', () {
      expect(
        canCompleteChapter(
          moduleLocked: false,
          chapterLocked: false,
          journeyState: 'VERROUILLE',
        ),
        isFalse,
      );
      expect(
        canCompleteChapter(
          moduleLocked: false,
          chapterLocked: false,
          journeyState: 'DISPONIBLE',
        ),
        isTrue,
      );
    });

    test('ouvrir une ressource ne déclenche aucune progression', () async {
      final requests = <http.Request>[];
      final client = MockClient((request) async {
        requests.add(request);
        return http.Response(
          jsonEncode({'url': 'https://content.test/document.pdf'}),
          200,
        );
      });
      final dependencies = await authenticatedApi(client);
      final opener = FakeUrlOpener();

      await ResourceActions(dependencies.api, opener).openResource(5, 8);

      expect(
        opener.opened.single,
        Uri.parse('https://content.test/document.pdf'),
      );
      expect(requests, hasLength(1));
      expect(requests.single.method, 'GET');
      expect(requests.single.url.path, '/catalogue/5/ressources/8/acces');
    });

    test(
      'la progression est envoyée seulement après l’action explicite',
      () async {
        late http.Request request;
        final dependencies = await authenticatedApi(
          MockClient((value) async {
            request = value;
            return http.Response(
              jsonEncode({'termine': true, 'pourcentage': 50}),
              200,
            );
          }),
        );

        await ResourceActions(
          dependencies.api,
          FakeUrlOpener(),
        ).completeChapter(5, 9);

        expect(request.method, 'PUT');
        expect(
          request.url.path,
          '/participant/formations/5/chapitres/9/progression',
        );
        expect(jsonDecode(request.body), {
          'termine': true,
          'positionVideoSecondes': 0,
        });
      },
    );

    test('un échec d’ouverture ne déclenche pas de progression', () async {
      var requests = 0;
      final dependencies = await authenticatedApi(
        MockClient((_) async {
          requests++;
          return http.Response(
            jsonEncode({'url': 'https://content.test/video'}),
            200,
          );
        }),
      );

      await expectLater(
        ResourceActions(
          dependencies.api,
          FakeUrlOpener(result: false),
        ).openResource(5, 8),
        throwsA(isA<ApiException>()),
      );
      expect(requests, 1);
    });
  });

  group('Offres et idempotence', () {
    test('distingue les offres et reprend les prix réels en DH', () {
      final offers = availableOffers({
        'inscrit': false,
        'typeAcces': null,
        'classesDisponibles': true,
        'prix': 120.5,
        'supplementClasses': 30,
        'prixAvecClasses': 150.5,
        'devise': 'DH',
      });

      expect(offers.map((offer) => offer.kind), [
        OfferKind.contenu,
        OfferKind.contenuEtClasses,
      ]);
      expect(offers.map((offer) => offer.price), [120.5, 150.5]);
      expect(offers.every((offer) => offer.currency == 'DH'), isTrue);
      expect(
        availableOffers({
          'inscrit': false,
          'classesDisponibles': false,
          'prix': 80,
          'prixAvecClasses': 999,
          'devise': 'DH',
        }).map((offer) => offer.kind),
        [OfferKind.contenu],
      );
    });

    test(
      'réutilise la même clé lors d’une nouvelle tentative réseau',
      () async {
        final keys = <String?>[];
        var attempt = 0;
        final dependencies = await authenticatedApi(
          MockClient((request) async {
            keys.add(request.headers['idempotency-key']);
            if (attempt++ == 0) throw Exception('coupure');
            return http.Response('{}', 200);
          }),
        );
        final coordinator = PurchaseCoordinator(
          dependencies.api,
          keyFactory: () => 'cle-imprevisible-1',
        );

        await expectLater(
          coordinator.start(7, OfferKind.contenuEtClasses),
          throwsA(
            isA<ApiException>().having(
              (e) => e.kind,
              'kind',
              ApiErrorKind.network,
            ),
          ),
        );
        await coordinator.retry(7, OfferKind.contenuEtClasses);

        expect(keys, ['cle-imprevisible-1', 'cle-imprevisible-1']);
      },
    );

    test(
      'génère une nouvelle clé pour une nouvelle action volontaire',
      () async {
        final sent = <String?>[];
        final generated = [
          'operation-aleatoire-a',
          'operation-aleatoire-b',
        ].iterator;
        final dependencies = await authenticatedApi(
          MockClient((request) async {
            sent.add(request.headers['idempotency-key']);
            return http.Response('{}', 200);
          }),
        );
        final coordinator = PurchaseCoordinator(
          dependencies.api,
          keyFactory: () {
            generated.moveNext();
            return generated.current;
          },
        );

        await coordinator.start(7, OfferKind.upgradeClasses);
        await coordinator.start(8, OfferKind.upgradeClasses);

        expect(sent, ['operation-aleatoire-a', 'operation-aleatoire-b']);
      },
    );

    test('un double clic partage une seule requête en vol', () async {
      final response = Completer<http.Response>();
      var requests = 0;
      final dependencies = await authenticatedApi(
        MockClient((_) {
          requests++;
          return response.future;
        }),
      );
      final coordinator = PurchaseCoordinator(
        dependencies.api,
        keyFactory: () => 'operation-unique',
      );

      final first = coordinator.start(7, OfferKind.upgradeClasses);
      final second = coordinator.start(7, OfferKind.upgradeClasses);
      await Future<void>.delayed(Duration.zero);
      expect(requests, 1);
      response.complete(http.Response('{}', 200));
      await Future.wait([first, second]);
      expect(requests, 1);
    });
  });
}
