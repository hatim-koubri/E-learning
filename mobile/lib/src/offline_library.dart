import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import 'api_client.dart';

class OfflineResource {
  const OfflineResource({
    required this.formationId,
    required this.resourceId,
    required this.title,
    required this.type,
    required this.path,
    required this.size,
    required this.downloadedAt,
  });

  final int formationId;
  final int resourceId;
  final String title;
  final String type;
  final String path;
  final int size;
  final DateTime downloadedAt;

  Map<String, dynamic> toJson() => {
    'formationId': formationId,
    'resourceId': resourceId,
    'title': title,
    'type': type,
    'path': path,
    'size': size,
    'downloadedAt': downloadedAt.toIso8601String(),
  };

  factory OfflineResource.fromJson(Map<String, dynamic> json) =>
      OfflineResource(
        formationId: json['formationId'] as int,
        resourceId: json['resourceId'] as int,
        title: json['title'] as String,
        type: json['type'] as String,
        path: json['path'] as String,
        size: json['size'] as int,
        downloadedAt: DateTime.parse(json['downloadedAt'] as String),
      );
}

abstract interface class OfflineLibrary {
  Future<void> cacheCourse(int formationId, Map<String, dynamic> course);
  Future<Map<String, dynamic>?> course(int formationId);
  Future<List<Map<String, dynamic>>> cachedCourses();
  Future<OfflineResource?> resource(int resourceId);
  Future<OfflineResource> download({
    required int formationId,
    required int resourceId,
    required String title,
    required String type,
    required Uri uri,
  });
  Future<void> removeResource(int resourceId);
  Future<void> clearAll();
}

class DeviceOfflineLibrary implements OfflineLibrary {
  DeviceOfflineLibrary({http.Client? client})
    : _client = client ?? http.Client();

  final http.Client _client;

  Future<Directory> get _root async {
    final support = await getApplicationSupportDirectory();
    final directory = Directory(
      '${support.path}${Platform.pathSeparator}offline_courses',
    );
    await directory.create(recursive: true);
    return directory;
  }

  Future<File> get _index async =>
      File('${(await _root).path}${Platform.pathSeparator}index.json');

  Future<Map<String, dynamic>> _readIndex() async {
    final file = await _index;
    if (!await file.exists()) {
      return {'courses': <String, dynamic>{}, 'resources': <String, dynamic>{}};
    }
    try {
      return Map<String, dynamic>.from(
        jsonDecode(await file.readAsString()) as Map,
      );
    } on Object {
      return {'courses': <String, dynamic>{}, 'resources': <String, dynamic>{}};
    }
  }

  Future<void> _writeIndex(Map<String, dynamic> index) async {
    final file = await _index;
    final temporary = File('${file.path}.tmp');
    await temporary.writeAsString(jsonEncode(index), flush: true);
    await temporary.rename(file.path);
  }

  @override
  Future<void> cacheCourse(int formationId, Map<String, dynamic> course) async {
    final index = await _readIndex();
    final courses = Map<String, dynamic>.from(index['courses'] as Map? ?? {});
    courses['$formationId'] = course;
    index['courses'] = courses;
    await _writeIndex(index);
  }

  @override
  Future<Map<String, dynamic>?> course(int formationId) async {
    final courses = (await _readIndex())['courses'] as Map?;
    final value = courses?['$formationId'];
    return value is Map ? Map<String, dynamic>.from(value) : null;
  }

  @override
  Future<List<Map<String, dynamic>>> cachedCourses() async {
    final courses = (await _readIndex())['courses'] as Map? ?? {};
    return courses.values
        .whereType<Map>()
        .map((value) => Map<String, dynamic>.from(value))
        .toList();
  }

  @override
  Future<OfflineResource?> resource(int resourceId) async {
    final resources = (await _readIndex())['resources'] as Map?;
    final value = resources?['$resourceId'];
    if (value is! Map) return null;
    final item = OfflineResource.fromJson(Map<String, dynamic>.from(value));
    if (!await File(item.path).exists()) return null;
    return item;
  }

  @override
  Future<OfflineResource> download({
    required int formationId,
    required int resourceId,
    required String title,
    required String type,
    required Uri uri,
  }) async {
    final response = await _client.get(uri);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const ApiException(
        ApiErrorKind.network,
        'Le téléchargement a échoué.',
      );
    }
    final extension = type == 'PDF'
        ? 'pdf'
        : type == 'VIDEO'
        ? 'mp4'
        : 'bin';
    final root = await _root;
    final file = File(
      '${root.path}${Platform.pathSeparator}resource-$resourceId.$extension',
    );
    final temporary = File('${file.path}.part');
    await temporary.writeAsBytes(response.bodyBytes, flush: true);
    await temporary.rename(file.path);
    final item = OfflineResource(
      formationId: formationId,
      resourceId: resourceId,
      title: title,
      type: type,
      path: file.path,
      size: response.bodyBytes.length,
      downloadedAt: DateTime.now().toUtc(),
    );
    final index = await _readIndex();
    final resources = Map<String, dynamic>.from(
      index['resources'] as Map? ?? {},
    );
    resources['$resourceId'] = item.toJson();
    index['resources'] = resources;
    await _writeIndex(index);
    return item;
  }

  @override
  Future<void> removeResource(int resourceId) async {
    final item = await resource(resourceId);
    if (item != null) {
      await File(item.path).delete().catchError((_) => File(item.path));
    }
    final index = await _readIndex();
    final resources = Map<String, dynamic>.from(
      index['resources'] as Map? ?? {},
    );
    resources.remove('$resourceId');
    index['resources'] = resources;
    await _writeIndex(index);
  }

  @override
  Future<void> clearAll() async {
    final root = await _root;
    if (await root.exists()) await root.delete(recursive: true);
  }
}
