import 'dart:convert';

import 'package:elearning_mobile/main.dart';
import 'package:elearning_mobile/src/api_client.dart';
import 'package:elearning_mobile/src/session.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'test_support.dart';

AppDependencies dependencies(MemoryTokenStore store, MockClient client) {
  final session = SessionController(store);
  return AppDependencies(
    session: session,
    api: ApiClient(
      baseUrl: 'https://api.test',
      session: session,
      httpClient: client,
      network: FixedNetworkMonitor(true),
    ),
    urlOpener: FakeUrlOpener(),
    offline: MemoryOfflineLibrary(),
  );
}

void main() {
  testWidgets('affiche un chargement puis restaure une session valide', (
    tester,
  ) async {
    final paths = <String>[];
    final app = dependencies(
      MemoryTokenStore('jwt-restaure'),
      MockClient((request) async {
        paths.add(request.url.path);
        if (request.url.path == '/participant/formations') {
          return http.Response('[]', 200);
        }
        if (request.url.path == '/catalogue') {
          return http.Response(jsonEncode({'content': []}), 200);
        }
        return http.Response('[]', 200);
      }),
    );

    await tester.pumpWidget(ElearningApp(dependencies: app));
    expect(find.byType(SessionLoadingPage), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);
    await tester.pumpAndSettle();

    expect(find.byType(HomePage), findsOneWidget);
    expect(find.text('Bienvenue'), findsNothing);
    expect(paths, contains('/participant/formations'));
  });

  testWidgets('sans token affiche la connexion sans écran privé', (
    tester,
  ) async {
    final app = dependencies(
      MemoryTokenStore(),
      MockClient((_) async => http.Response('Requête inattendue', 500)),
    );

    await tester.pumpWidget(ElearningApp(dependencies: app));
    expect(find.byType(HomePage), findsNothing);
    await tester.pumpAndSettle();

    expect(find.text('Bienvenue'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
    expect(find.byType(HomePage), findsNothing);
  });

  testWidgets('un 401 ramène à la connexion avec un message accessible', (
    tester,
  ) async {
    var calls = 0;
    final store = MemoryTokenStore('jwt-expire');
    final app = dependencies(
      store,
      MockClient((request) async {
        calls++;
        if (calls == 1) return http.Response('[]', 200);
        if (calls == 2) return http.Response(jsonEncode({'content': []}), 200);
        return http.Response('', 401);
      }),
    );

    await tester.pumpWidget(ElearningApp(dependencies: app));
    await tester.pumpAndSettle();
    expect(find.byType(HomePage), findsOneWidget);
    await tester.tap(find.byIcon(Icons.search).first);
    await tester.pumpAndSettle();

    expect(find.text('Bienvenue'), findsOneWidget);
    expect(find.text('Votre session a expiré.'), findsOneWidget);
    expect(store.value, isNull);
  });

  testWidgets('restaure les cours telecharges lorsque le reseau est absent', (
    tester,
  ) async {
    final store = MemoryTokenStore('jwt-stocke');
    final session = SessionController(store);
    final offline = MemoryOfflineLibrary();
    offline.courses[7] = {
      'id': 7,
      'titre': 'Cours hors ligne',
      'categorie': 'Test',
      'prix': 0,
      'modules': <dynamic>[],
      'inscrit': true,
      '_chapterStates': <String, dynamic>{},
    };
    final app = AppDependencies(
      session: session,
      api: ApiClient(
        baseUrl: 'https://api.test',
        session: session,
        httpClient: MockClient((_) async => throw Exception('offline')),
        network: FixedNetworkMonitor(false),
      ),
      urlOpener: FakeUrlOpener(),
      offline: offline,
    );

    await tester.pumpWidget(ElearningApp(dependencies: app));
    await tester.pumpAndSettle();
    expect(find.byType(HomePage), findsOneWidget);
    await tester.tap(find.text('Mes formations'));
    await tester.pumpAndSettle();
    expect(find.text('Cours hors ligne'), findsOneWidget);
  });
}
