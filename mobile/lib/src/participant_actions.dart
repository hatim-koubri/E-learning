import 'dart:math';

import 'package:url_launcher/url_launcher.dart';
import 'package:open_filex/open_filex.dart';

import 'api_client.dart';

enum OfferKind { contenu, contenuEtClasses, upgradeClasses }

class ParticipantOffer {
  const ParticipantOffer({
    required this.kind,
    required this.label,
    required this.price,
    required this.currency,
  });

  final OfferKind kind;
  final String label;
  final num price;
  final String currency;
}

List<ParticipantOffer> availableOffers(Map<String, dynamic> course) {
  final enrolled = course['inscrit'] == true;
  final type = course['typeAcces'] as String?;
  final classesAvailable = course['classesDisponibles'] == true;
  final currency = (course['devise'] as String?) ?? 'DH';
  num amount(String key) => course[key] is num ? course[key] as num : 0;

  if (!enrolled) {
    return [
      ParticipantOffer(
        kind: OfferKind.contenu,
        label: 'Accès autonome',
        price: amount('prix'),
        currency: currency,
      ),
      if (classesAvailable)
        ParticipantOffer(
          kind: OfferKind.contenuEtClasses,
          label: 'Contenu + classes',
          price: amount('prixAvecClasses'),
          currency: currency,
        ),
    ];
  }
  if (classesAvailable && type == 'CONTENU') {
    return [
      ParticipantOffer(
        kind: OfferKind.upgradeClasses,
        label: 'Ajouter les classes',
        price: amount('supplementClasses'),
        currency: currency,
      ),
    ];
  }
  return const [];
}

abstract interface class ExternalUrlOpener {
  Future<bool> open(Uri uri);
}

class LauncherUrlOpener implements ExternalUrlOpener {
  @override
  Future<bool> open(Uri uri) async {
    try {
      if (uri.scheme == 'file') {
        final result = await OpenFilex.open(uri.toFilePath());
        return result.type == ResultType.done;
      }
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } on Exception {
      return false;
    }
  }
}

bool canCompleteChapter({
  required bool moduleLocked,
  required bool chapterLocked,
  required String? journeyState,
}) =>
    !moduleLocked &&
    !chapterLocked &&
    journeyState != 'VERROUILLE' &&
    journeyState != 'TERMINE';

class ResourceActions {
  ResourceActions(this._api, this._opener);

  final ApiClient _api;
  final ExternalUrlOpener _opener;

  Future<void> openResource(int formationId, int resourceId) async {
    final access =
        await _api.call('/catalogue/$formationId/ressources/$resourceId/acces')
            as Map;
    final rawUrl = access['url'];
    final uri = rawUrl is String ? Uri.tryParse(rawUrl) : null;
    if (uri == null || !await _opener.open(uri)) {
      throw const ApiException(
        ApiErrorKind.other,
        'Impossible d’ouvrir cette ressource.',
      );
    }
  }

  Future<Map> completeChapter(int formationId, int chapterId) async =>
      await _api.call(
            '/participant/formations/$formationId/chapitres/$chapterId/progression',
            method: 'PUT',
            body: {'termine': true, 'positionVideoSecondes': 0},
          )
          as Map;
}

typedef IdempotencyKeyFactory = String Function();

String secureIdempotencyKey() {
  final random = Random.secure();
  final bytes = List<int>.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hex(int value) => value.toRadixString(16).padLeft(2, '0');
  final value = bytes.map(hex).join();
  return 'mobile-${value.substring(0, 8)}-${value.substring(8, 12)}-'
      '${value.substring(12, 16)}-${value.substring(16, 20)}-'
      '${value.substring(20)}';
}

class PurchaseCoordinator {
  PurchaseCoordinator(this._api, {IdempotencyKeyFactory? keyFactory})
    : _keyFactory = keyFactory ?? secureIdempotencyKey;

  final ApiClient _api;
  final IdempotencyKeyFactory _keyFactory;
  String? _retryKey;
  Future<dynamic>? _inFlight;

  String? get retryKey => _retryKey;
  bool get isBusy => _inFlight != null;

  Future<dynamic> start(int formationId, OfferKind kind) {
    final active = _inFlight;
    if (active != null) return active;
    _retryKey = kind == OfferKind.contenu ? null : _keyFactory();
    return _execute(formationId, kind);
  }

  Future<dynamic> retry(int formationId, OfferKind kind) {
    if (kind != OfferKind.contenu && _retryKey == null) {
      throw StateError('Aucune opération à réessayer.');
    }
    return _execute(formationId, kind);
  }

  Future<dynamic> _execute(int formationId, OfferKind kind) {
    final active = _inFlight;
    if (active != null) return active;
    final operation = _request(formationId, kind);
    _inFlight = operation;
    operation
        .then<void>(
          (_) => _retryKey = null,
          onError: (Object error, StackTrace stack) {
            if (error is! ApiException ||
                (error.kind != ApiErrorKind.network &&
                    error.kind != ApiErrorKind.server)) {
              _retryKey = null;
            }
          },
        )
        .whenComplete(() => _inFlight = null);
    return operation;
  }

  Future<dynamic> _request(int formationId, OfferKind kind) => switch (kind) {
    OfferKind.contenu => _api.call(
      '/participant/formations/$formationId/inscription',
      method: 'POST',
    ),
    OfferKind.contenuEtClasses => _api.call(
      '/participant/formations/$formationId/inscription-avec-classes',
      method: 'POST',
      headers: {'Idempotency-Key': _retryKey!},
    ),
    OfferKind.upgradeClasses => _api.call(
      '/participant/formations/$formationId/upgrade-classes',
      method: 'POST',
      headers: {'Idempotency-Key': _retryKey!},
    ),
  };
}
