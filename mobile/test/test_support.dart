import 'package:elearning_mobile/src/api_client.dart';
import 'package:elearning_mobile/src/participant_actions.dart';
import 'package:elearning_mobile/src/offline_library.dart';
import 'package:elearning_mobile/src/session.dart';

class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this.value]);

  String? value;
  int reads = 0;
  int writes = 0;
  int deletes = 0;

  @override
  Future<String?> read() async {
    reads++;
    return value;
  }

  @override
  Future<void> write(String token) async {
    writes++;
    value = token;
  }

  @override
  Future<void> delete() async {
    deletes++;
    value = null;
  }
}

class UnreadableTokenStore implements TokenStore {
  @override
  Future<String?> read() => throw Exception('stockage indisponible');

  @override
  Future<void> write(String token) async {}

  @override
  Future<void> delete() async {}
}

class FixedNetworkMonitor implements NetworkMonitor {
  FixedNetworkMonitor(this.online);
  bool online;

  @override
  Future<bool> get isOnline async => online;
}

class FakeUrlOpener implements ExternalUrlOpener {
  FakeUrlOpener({this.result = true});
  bool result;
  final opened = <Uri>[];

  @override
  Future<bool> open(Uri uri) async {
    opened.add(uri);
    return result;
  }
}

class MemoryOfflineLibrary implements OfflineLibrary {
  final courses = <int, Map<String, dynamic>>{};
  final resources = <int, OfflineResource>{};
  bool cleared = false;

  @override
  Future<void> cacheCourse(
    int formationId,
    Map<String, dynamic> course,
  ) async => courses[formationId] = Map<String, dynamic>.from(course);
  @override
  Future<Map<String, dynamic>?> course(int formationId) async =>
      courses[formationId];
  @override
  Future<List<Map<String, dynamic>>> cachedCourses() async =>
      courses.values.toList();
  @override
  Future<List<Map<String, dynamic>>> installedCourses() async =>
      courses.values.where((course) => course['_installed'] == true).toList();
  @override
  Future<void> installCourse(
    int formationId,
    Map<String, dynamic> course,
  ) async {
    courses[formationId] = Map<String, dynamic>.from(course)
      ..['_installed'] = true;
  }

  @override
  Future<void> uninstallCourse(int formationId) async {
    courses.remove(formationId);
    resources.removeWhere((_, item) => item.formationId == formationId);
  }

  @override
  Future<OfflineResource?> resource(int resourceId) async =>
      resources[resourceId];
  @override
  Future<OfflineResource> download({
    required int formationId,
    required int resourceId,
    required String title,
    required String type,
    required Uri uri,
  }) async {
    final item = OfflineResource(
      formationId: formationId,
      resourceId: resourceId,
      title: title,
      type: type,
      path: '/offline/$resourceId',
      size: 10,
      downloadedAt: DateTime.utc(2026),
    );
    resources[resourceId] = item;
    return item;
  }

  @override
  Future<void> removeResource(int resourceId) async =>
      resources.remove(resourceId);
  @override
  Future<void> clearAll() async {
    courses.clear();
    resources.clear();
    cleared = true;
  }
}
