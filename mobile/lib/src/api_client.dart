import 'dart:async';
import 'dart:convert';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:http/http.dart' as http;

import 'session.dart';

enum ApiErrorKind {
  badRequest,
  unauthorized,
  forbidden,
  conflict,
  network,
  server,
  other,
}

class ApiException implements Exception {
  const ApiException(this.kind, this.message, {this.statusCode});

  final ApiErrorKind kind;
  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

abstract interface class NetworkMonitor {
  Future<bool> get isOnline;
}

class ConnectivityNetworkMonitor implements NetworkMonitor {
  @override
  Future<bool> get isOnline async => !(await Connectivity().checkConnectivity())
      .contains(ConnectivityResult.none);
}

class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.session,
    http.Client? httpClient,
    NetworkMonitor? network,
  }) : _http = httpClient ?? http.Client(),
       _network = network ?? ConnectivityNetworkMonitor();

  final String baseUrl;
  final SessionController session;
  final http.Client _http;
  final NetworkMonitor _network;

  Future<dynamic> call(
    String path, {
    String method = 'GET',
    Object? body,
    Map<String, String>? headers,
    bool authenticated = true,
  }) async {
    if (!await _network.isOnline) {
      throw const ApiException(
        ApiErrorKind.network,
        'Réseau indisponible. Vérifiez votre connexion.',
      );
    }

    final token = session.token;
    if (authenticated && (token == null || token.isEmpty)) {
      throw const ApiException(
        ApiErrorKind.unauthorized,
        'Authentification requise.',
        statusCode: 401,
      );
    }

    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    request.headers.addAll({
      'Content-Type': 'application/json',
      if (authenticated) 'Authorization': 'Bearer $token',
      ...?headers,
    });
    if (body != null) request.body = jsonEncode(body);

    http.StreamedResponse response;
    try {
      response = await _http.send(request);
    } on Exception {
      throw const ApiException(
        ApiErrorKind.network,
        'Impossible de joindre le serveur.',
      );
    }
    final text = await response.stream.bytesToString();
    final message = _message(text);

    if (response.statusCode == 401) {
      if (authenticated) {
        unawaited(
          Future<void>.delayed(Duration.zero).then((_) => session.expire()),
        );
      }
      throw ApiException(
        ApiErrorKind.unauthorized,
        authenticated
            ? 'Votre session a expiré.'
            : (message ?? 'Identifiants invalides.'),
        statusCode: 401,
      );
    }
    if (response.statusCode >= 400) {
      throw ApiException(
        _kind(response.statusCode),
        message ?? _fallback(response.statusCode),
        statusCode: response.statusCode,
      );
    }
    if (text.isEmpty) return null;
    try {
      return jsonDecode(text);
    } on FormatException {
      throw const ApiException(ApiErrorKind.other, 'Réponse serveur invalide.');
    }
  }

  ApiErrorKind _kind(int status) => switch (status) {
    400 => ApiErrorKind.badRequest,
    403 => ApiErrorKind.forbidden,
    409 => ApiErrorKind.conflict,
    >= 500 => ApiErrorKind.server,
    _ => ApiErrorKind.other,
  };

  String _fallback(int status) => switch (status) {
    400 => 'La demande est invalide.',
    403 => 'Vous n’avez pas accès à cette action.',
    409 => 'Cette opération entre en conflit avec l’état actuel.',
    >= 500 => 'Le serveur est temporairement indisponible.',
    _ => 'Une erreur est survenue.',
  };

  String? _message(String text) {
    if (text.isEmpty) return null;
    try {
      final data = jsonDecode(text);
      return data is Map && data['message'] is String
          ? data['message'] as String
          : null;
    } on FormatException {
      return null;
    }
  }
}
