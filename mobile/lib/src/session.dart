import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class TokenStore {
  Future<String?> read();
  Future<void> write(String token);
  Future<void> delete();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
    : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'jwt';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String token) => _storage.write(key: _key, value: token);

  @override
  Future<void> delete() => _storage.delete(key: _key);
}

enum SessionStatus { loading, authenticated, unauthenticated, unavailable }

class SessionController extends ChangeNotifier {
  SessionController(this._store);

  final TokenStore _store;
  SessionStatus _status = SessionStatus.loading;
  String? _token;
  String? _message;
  Future<void>? _expiration;

  SessionStatus get status => _status;
  String? get token => _token;
  String? get message => _message;

  Future<bool> loadStoredToken() async {
    _status = SessionStatus.loading;
    _message = null;
    notifyListeners();
    String? stored;
    try {
      stored = await _store.read();
    } on Exception {
      _token = null;
      _status = SessionStatus.unauthenticated;
      _message = null;
      notifyListeners();
      return false;
    }
    if (stored == null || stored.trim().isEmpty) {
      _token = null;
      _status = SessionStatus.unauthenticated;
      notifyListeners();
      return false;
    }
    _token = stored;
    return true;
  }

  void completeRestoration() {
    _status = SessionStatus.authenticated;
    _message = null;
    notifyListeners();
  }

  void restorationUnavailable([String? message]) {
    _status = SessionStatus.unavailable;
    _message = message ?? 'Réseau indisponible. Vérifiez votre connexion.';
    notifyListeners();
  }

  Future<void> rejectStoredToken() async {
    try {
      await _store.delete();
    } on Exception {
      // L'état mémoire doit être nettoyé même si le stockage natif échoue.
    } finally {
      _token = null;
      _status = SessionStatus.unauthenticated;
      _message = null;
      notifyListeners();
    }
  }

  Future<void> authenticate(String token) async {
    await _store.write(token);
    _token = token;
    _status = SessionStatus.authenticated;
    _message = null;
    notifyListeners();
  }

  Future<void> expire() {
    if (_token == null && _status == SessionStatus.unauthenticated) {
      return Future<void>.value();
    }
    final active = _expiration;
    if (active != null) return active;
    final operation = _expireOnce();
    _expiration = operation;
    operation.whenComplete(() => _expiration = null);
    return operation;
  }

  Future<void> _expireOnce() async {
    try {
      await _store.delete();
    } on Exception {
      // L'état mémoire doit être nettoyé même si le stockage natif échoue.
    } finally {
      _token = null;
      _status = SessionStatus.unauthenticated;
      _message = 'Votre session a expiré.';
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await _store.delete();
    } on Exception {
      // L'état mémoire doit être nettoyé même si le stockage natif échoue.
    } finally {
      _token = null;
      _status = SessionStatus.unauthenticated;
      _message = null;
      notifyListeners();
    }
  }
}
