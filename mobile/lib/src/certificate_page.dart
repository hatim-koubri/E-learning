import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

import 'api_client.dart';
import 'embedded_content.dart';
import 'nexa_design.dart';
import 'offline_library.dart';

class CertificatesPage extends StatefulWidget {
  const CertificatesPage({required this.api, required this.offline, super.key});

  final ApiClient api;
  final OfflineLibrary offline;

  @override
  State<CertificatesPage> createState() => _CertificatesPageState();
}

class _CertificatesPageState extends State<CertificatesPage> {
  late Future<List<Map<String, dynamic>>> certificates;
  int? busyId;

  @override
  void initState() {
    super.initState();
    certificates = load();
  }

  Future<Directory> get directory async {
    final support = await getApplicationSupportDirectory();
    final result = Directory(
      '${support.path}${Platform.pathSeparator}certificates',
    );
    await result.create(recursive: true);
    return result;
  }

  Future<File> certificateFile(int formationId) async => File(
    '${(await directory).path}${Platform.pathSeparator}certificat-khotwa-$formationId.pdf',
  );

  Future<List<Map<String, dynamic>>> load() async {
    List<dynamic> courses;
    var online = true;
    try {
      courses = await widget.api.call('/participant/formations') as List;
    } on ApiException catch (error) {
      if (error.kind != ApiErrorKind.network) rethrow;
      online = false;
      courses = await widget.offline.cachedCourses();
    }
    final result = <Map<String, dynamic>>[];
    for (final rawCourse in courses) {
      final course = Map<String, dynamic>.from(rawCourse as Map);
      final id = (course['formationId'] ?? course['id']) as int;
      final file = await certificateFile(id);
      var eligible = false;
      if (online) {
        try {
          final evaluation =
              await widget.api.call('/participant/formations/$id/evaluations')
                  as Map;
          eligible = evaluation['certificatDisponible'] == true;
        } on ApiException {
          eligible = false;
        }
      }
      if (eligible || await file.exists()) {
        course['_eligible'] = eligible;
        course['_localPath'] = await file.exists() ? file.path : null;
        result.add(course);
      }
    }
    return result;
  }

  Future<void> openCertificate(Map<String, dynamic> course) async {
    final id = (course['formationId'] ?? course['id']) as int;
    var path = course['_localPath'] as String?;
    if (path == null) {
      setState(() => busyId = id);
      try {
        final bytes = await widget.api.download(
          '/participant/formations/$id/certificat',
        );
        final file = await certificateFile(id);
        await file.writeAsBytes(bytes, flush: true);
        path = file.path;
        course['_localPath'] = path;
      } on ApiException catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(error.message)));
        }
        return;
      } finally {
        if (mounted) setState(() => busyId = null);
      }
    }
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => EmbeddedContentPage(
          title: 'Certificat • ${course['titre']}',
          type: 'PDF',
          localPath: path,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Mes certificats')),
    body: FutureBuilder<List<Map<String, dynamic>>>(
      future: certificates,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return const Center(
            child: Text('Impossible de charger vos certificats.'),
          );
        }
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final items = snapshot.data!;
        if (items.isEmpty) {
          return const PremiumEmptyState(
            icon: Icons.workspace_premium_outlined,
            title: 'Aucun certificat disponible',
            message:
                'Terminez les chapitres et réussissez les quiz obligatoires pour obtenir votre premier certificat.',
          );
        }
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
          children: [
            const SectionHeader(
              'Vos réussites',
              subtitle: 'Consultez et conservez vos certificats Khotwa',
            ),
            const SizedBox(height: 16),
            ...items.expand((course) {
              final id = (course['formationId'] ?? course['id']) as int;
              final local = course['_localPath'] != null;
              return <Widget>[
                Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(22),
                    onTap: busyId == null
                        ? () => openCertificate(course)
                        : null,
                    child: Padding(
                      padding: const EdgeInsets.all(18),
                      child: Row(
                        children: [
                          Container(
                            width: 60,
                            height: 70,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [
                                  NexaColors.primary,
                                  NexaColors.primaryDark,
                                ],
                              ),
                              borderRadius: BorderRadius.circular(17),
                            ),
                            child: const Icon(
                              Icons.workspace_premium_rounded,
                              color: Colors.white,
                              size: 30,
                            ),
                          ),
                          const SizedBox(width: 15),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const StatusPill(
                                  'FORMATION TERMINÉE',
                                  icon: Icons.verified_rounded,
                                  color: NexaColors.aqua,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${course['titre']}',
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 5),
                                Text(
                                  local
                                      ? 'Disponible sur cet appareil'
                                      : 'Prêt à télécharger',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ],
                            ),
                          ),
                          if (busyId == id)
                            const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          else
                            Icon(
                              local
                                  ? Icons.visibility_rounded
                                  : Icons.download_rounded,
                              color: NexaColors.primary,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
              ];
            }),
          ],
        );
      },
    ),
  );
}
