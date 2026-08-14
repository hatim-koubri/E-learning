import 'dart:async';

import 'package:flutter/material.dart';

import 'src/api_client.dart';
import 'src/participant_actions.dart';
import 'src/offline_library.dart';
import 'src/session.dart';

const apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:8080/api',
);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(ElearningApp(dependencies: AppDependencies.production()));
}

class AppDependencies {
  AppDependencies({
    required this.session,
    required this.api,
    required this.urlOpener,
    OfflineLibrary? offline,
    IdempotencyKeyFactory? idempotencyKeyFactory,
  }) : offline = offline ?? DeviceOfflineLibrary(),
       idempotencyKeyFactory = idempotencyKeyFactory ?? secureIdempotencyKey;

  factory AppDependencies.production() {
    final session = SessionController(SecureTokenStore());
    return AppDependencies(
      session: session,
      api: ApiClient(baseUrl: apiUrl, session: session),
      urlOpener: LauncherUrlOpener(),
      offline: DeviceOfflineLibrary(),
    );
  }

  final SessionController session;
  final ApiClient api;
  final ExternalUrlOpener urlOpener;
  final OfflineLibrary offline;
  final IdempotencyKeyFactory idempotencyKeyFactory;

  Future<void> restoreSession() async {
    if (!await session.loadStoredToken()) return;
    try {
      await api.call('/participant/formations');
      session.completeRestoration();
    } on ApiException catch (error) {
      if (error.kind == ApiErrorKind.unauthorized) return;
      if (error.kind == ApiErrorKind.network ||
          error.kind == ApiErrorKind.server) {
        if ((await offline.cachedCourses()).isNotEmpty) {
          session.completeRestoration();
          return;
        }
        session.restorationUnavailable(error.message);
        return;
      }
      await session.rejectStoredToken();
    }
  }
}

class ElearningApp extends StatefulWidget {
  const ElearningApp({required this.dependencies, super.key});

  final AppDependencies dependencies;

  @override
  State<ElearningApp> createState() => _ElearningAppState();
}

class _ElearningAppState extends State<ElearningApp> {
  @override
  void initState() {
    super.initState();
    widget.dependencies.restoreSession();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'NexaLearn',
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff3157d5)),
      useMaterial3: true,
    ),
    home: ListenableBuilder(
      listenable: widget.dependencies.session,
      builder: (context, _) => switch (widget.dependencies.session.status) {
        SessionStatus.loading => const SessionLoadingPage(),
        SessionStatus.authenticated => HomePage(
          dependencies: widget.dependencies,
        ),
        SessionStatus.unauthenticated => LoginPage(
          dependencies: widget.dependencies,
        ),
        SessionStatus.unavailable => SessionUnavailablePage(
          message: widget.dependencies.session.message!,
          onRetry: widget.dependencies.restoreSession,
        ),
      },
    ),
  );
}

class SessionLoadingPage extends StatelessWidget {
  const SessionLoadingPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Semantics(
        label: 'Vérification de votre session',
        liveRegion: true,
        child: const CircularProgressIndicator(),
      ),
    ),
  );
}

class SessionUnavailablePage extends StatelessWidget {
  const SessionUnavailablePage({
    required this.message,
    required this.onRetry,
    super.key,
  });

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 48),
            const SizedBox(height: 12),
            Semantics(
              liveRegion: true,
              child: Text(message, textAlign: TextAlign.center),
            ),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Réessayer')),
          ],
        ),
      ),
    ),
  );
}

class LoginPage extends StatefulWidget {
  const LoginPage({required this.dependencies, super.key});

  final AppDependencies dependencies;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool busy = false;

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  Future<void> login() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data =
          await widget.dependencies.api.call(
                '/auth/login',
                method: 'POST',
                authenticated: false,
                body: {'email': email.text.trim(), 'password': password.text},
              )
              as Map;
      final token = data['accessToken'];
      if (token is! String || token.isEmpty) {
        throw const ApiException(
          ApiErrorKind.other,
          'Réponse de connexion invalide.',
        );
      }
      await widget.dependencies.session.authenticate(token);
    } on ApiException catch (exception) {
      if (mounted) setState(() => error = exception.message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.school, size: 64),
                Text(
                  'Bienvenue',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                TextField(
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                TextField(
                  controller: password,
                  obscureText: true,
                  autofillHints: const [AutofillHints.password],
                  onSubmitted: busy ? null : (_) => login(),
                  decoration: const InputDecoration(labelText: 'Mot de passe'),
                ),
                if (widget.dependencies.session.message case final message?)
                  Semantics(
                    liveRegion: true,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        message,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  ),
                if (error case final value?)
                  Semantics(
                    liveRegion: true,
                    child: Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Text(
                        value,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: busy ? null : login,
                  child: Text(busy ? 'Connexion…' : 'Se connecter'),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class HomePage extends StatefulWidget {
  const HomePage({required this.dependencies, super.key});

  final AppDependencies dependencies;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int tab = 0;

  Future<void> logout() async {
    await widget.dependencies.offline.clearAll();
    await widget.dependencies.session.logout();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('NexaLearn'),
      actions: [
        IconButton(
          tooltip: 'Se déconnecter',
          icon: const Icon(Icons.logout),
          onPressed: logout,
        ),
      ],
    ),
    body: [
      CataloguePage(dependencies: widget.dependencies),
      MyCoursesPage(dependencies: widget.dependencies),
      ClassesPage(dependencies: widget.dependencies),
    ][tab],
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: (value) => setState(() => tab = value),
      destinations: const [
        NavigationDestination(icon: Icon(Icons.search), label: 'Catalogue'),
        NavigationDestination(
          icon: Icon(Icons.menu_book),
          label: 'Mes formations',
        ),
        NavigationDestination(
          icon: Icon(Icons.video_call),
          label: 'Mes classes',
        ),
      ],
    ),
  );
}

class CataloguePage extends StatefulWidget {
  const CataloguePage({required this.dependencies, super.key});

  final AppDependencies dependencies;

  @override
  State<CataloguePage> createState() => _CataloguePageState();
}

class _CataloguePageState extends State<CataloguePage> {
  final search = TextEditingController();
  Future<dynamic>? result;

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  void load() {
    final completer = Completer<dynamic>();
    setState(() {
      result = completer.future;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        completer.complete(
          await widget.dependencies.api.call(
            '/catalogue?q=${Uri.encodeQueryComponent(search.text)}&size=20',
          ),
        );
      } catch (error, stackTrace) {
        completer.completeError(error, stackTrace);
      }
    });
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: TextField(
          controller: search,
          onSubmitted: (_) => load(),
          decoration: InputDecoration(
            labelText: 'Rechercher',
            suffixIcon: IconButton(
              onPressed: load,
              icon: const Icon(Icons.search),
            ),
          ),
        ),
      ),
      Expanded(
        child: FutureBuilder(
          future: result,
          builder: (context, snapshot) {
            if (snapshot.hasError) return ErrorView(snapshot.error);
            if (!snapshot.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final items = (snapshot.data as Map)['content'] as List;
            return ListView.builder(
              itemCount: items.length,
              itemBuilder: (_, index) => CourseTile(
                Map<String, dynamic>.from(items[index] as Map),
                dependencies: widget.dependencies,
              ),
            );
          },
        ),
      ),
    ],
  );
}

class CourseTile extends StatelessWidget {
  const CourseTile(this.course, {required this.dependencies, super.key});

  final Map<String, dynamic> course;
  final AppDependencies dependencies;

  @override
  Widget build(BuildContext context) => ListTile(
    title: Text(course['titre'] as String),
    subtitle: Text('${course['categorie'] ?? ''} • ${course['prix'] ?? 0} DH'),
    trailing: const Icon(Icons.chevron_right),
    onTap: () => Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CoursePage(
          id: (course['formationId'] ?? course['id']) as int,
          dependencies: dependencies,
        ),
      ),
    ),
  );
}

class MyCoursesPage extends StatelessWidget {
  const MyCoursesPage({required this.dependencies, super.key});

  final AppDependencies dependencies;

  Future<List<dynamic>> load() async {
    try {
      return await dependencies.api.call('/participant/formations') as List;
    } on ApiException catch (error) {
      if (error.kind != ApiErrorKind.network) rethrow;
      return dependencies.offline.cachedCourses();
    }
  }

  @override
  Widget build(BuildContext context) => FutureBuilder(
    future: load(),
    builder: (context, snapshot) {
      if (snapshot.hasError) return ErrorView(snapshot.error);
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      final items = snapshot.data as List;
      if (items.isEmpty) return const Center(child: Text('Aucune formation.'));
      return ListView(
        children: items
            .map(
              (item) => CourseTile(
                Map<String, dynamic>.from(item as Map),
                dependencies: dependencies,
              ),
            )
            .toList(),
      );
    },
  );
}

class CoursePage extends StatefulWidget {
  const CoursePage({required this.id, required this.dependencies, super.key});

  final int id;
  final AppDependencies dependencies;

  @override
  State<CoursePage> createState() => _CoursePageState();
}

class _CoursePageState extends State<CoursePage> {
  late Future<Map<String, dynamic>> detail;
  late final ResourceActions resources;
  late final PurchaseCoordinator purchases;
  bool actionBusy = false;
  bool courseDownloadBusy = false;

  @override
  void initState() {
    super.initState();
    resources = ResourceActions(
      widget.dependencies.api,
      widget.dependencies.urlOpener,
    );
    purchases = PurchaseCoordinator(
      widget.dependencies.api,
      keyFactory: widget.dependencies.idempotencyKeyFactory,
    );
    detail = _load();
  }

  Future<Map<String, dynamic>> _load() async {
    Map<String, dynamic> course;
    try {
      course = Map<String, dynamic>.from(
        await widget.dependencies.api.call('/catalogue/${widget.id}') as Map,
      );
    } on ApiException catch (error) {
      if (error.kind != ApiErrorKind.network) rethrow;
      final cached = await widget.dependencies.offline.course(widget.id);
      if (cached == null) rethrow;
      cached['_offline'] = true;
      return cached;
    }
    final chapterStates = <int, String>{};
    if (course['inscrit'] == true) {
      final journey =
          await widget.dependencies.api.call(
                '/participant/formations/${widget.id}/parcours',
              )
              as Map;
      for (final module in journey['modules'] as List) {
        for (final chapter in (module as Map)['chapitres'] as List) {
          final item = chapter as Map;
          chapterStates[item['id'] as int] = item['etat'] as String;
        }
      }
    }
    course['_chapterStates'] = chapterStates.map(
      (key, value) => MapEntry('$key', value),
    );
    if (course['inscrit'] == true) {
      await widget.dependencies.offline.cacheCourse(widget.id, course);
    }
    return course;
  }

  void _reload() => setState(() => detail = _load());

  void message(String value, {SnackBarAction? action}) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(value), action: action));
  }

  Future<void> openResource(Map resource) async {
    try {
      final local = await widget.dependencies.offline.resource(
        resource['id'] as int,
      );
      if (local != null) {
        if (!await widget.dependencies.urlOpener.open(Uri.file(local.path))) {
          throw const ApiException(
            ApiErrorKind.other,
            'Impossible d’ouvrir le fichier hors ligne.',
          );
        }
        return;
      }
      await resources.openResource(widget.id, resource['id'] as int);
    } on ApiException catch (error) {
      message(error.message);
    }
  }

  Future<void> downloadResource(Map resource) async {
    try {
      final access =
          await widget.dependencies.api.call(
                '/catalogue/${widget.id}/ressources/${resource['id']}/acces',
              )
              as Map;
      if (access['telechargeable'] != true) {
        throw const ApiException(
          ApiErrorKind.forbidden,
          'Le formateur n’autorise pas le téléchargement de cette ressource.',
        );
      }
      final uri = Uri.tryParse(access['url'] as String? ?? '');
      if (uri == null) {
        throw const ApiException(
          ApiErrorKind.other,
          'Adresse de téléchargement invalide.',
        );
      }
      await widget.dependencies.offline.download(
        formationId: widget.id,
        resourceId: resource['id'] as int,
        title: resource['titre'] as String,
        type: resource['type'] as String,
        uri: uri,
      );
      message('Ressource disponible hors ligne.');
      if (mounted) setState(() {});
    } on ApiException catch (error) {
      message(error.message);
    }
  }

  Future<void> downloadCourse(Map<String, dynamic> course) async {
    if (courseDownloadBusy) return;
    setState(() => courseDownloadBusy = true);
    var downloaded = 0;
    var alreadyAvailable = 0;
    try {
      for (final rawModule in course['modules'] as List) {
        final module = rawModule as Map;
        if (module['verrouille'] == true) continue;
        for (final rawChapter in module['chapitres'] as List) {
          final chapter = rawChapter as Map;
          if (chapter['verrouille'] == true) continue;
          for (final rawResource in chapter['ressources'] as List) {
            final resource = rawResource as Map;
            if (resource['verrouille'] == true ||
                resource['type'] == 'YOUTUBE') {
              continue;
            }
            if (await widget.dependencies.offline.resource(
                  resource['id'] as int,
                ) !=
                null) {
              alreadyAvailable++;
              continue;
            }
            final access =
                await widget.dependencies.api.call(
                      '/catalogue/${widget.id}/ressources/${resource['id']}/acces',
                    )
                    as Map;
            if (access['telechargeable'] != true) continue;
            final uri = Uri.tryParse(access['url'] as String? ?? '');
            if (uri == null) continue;
            await widget.dependencies.offline.download(
              formationId: widget.id,
              resourceId: resource['id'] as int,
              title: resource['titre'] as String,
              type: resource['type'] as String,
              uri: uri,
            );
            downloaded++;
          }
        }
      }
      await widget.dependencies.offline.cacheCourse(widget.id, course);
      message(
        downloaded > 0
            ? '$downloaded ressource(s) téléchargée(s). Le cours est prêt hors ligne.'
            : alreadyAvailable > 0
            ? 'Ce cours est déjà disponible hors ligne.'
            : 'Aucune ressource de ce cours n’est autorisée au téléchargement.',
      );
      if (mounted) setState(() {});
    } on ApiException catch (error) {
      message('$downloaded ressource(s) enregistrée(s). ${error.message}');
    } finally {
      if (mounted) setState(() => courseDownloadBusy = false);
    }
  }

  Future<void> completeChapter(int chapterId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Terminer ce chapitre ?'),
        content: const Text(
          'Confirmez uniquement après avoir réellement consulté les ressources du chapitre.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await resources.completeChapter(widget.id, chapterId);
      message('Chapitre marqué comme terminé.');
      _reload();
    } on ApiException catch (error) {
      message(error.message);
    }
  }

  Future<void> selectOffer(ParticipantOffer offer) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Récapitulatif'),
        content: Text(
          '${offer.label}\nMontant : ${offer.price} ${offer.currency}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Confirmer'),
          ),
        ],
      ),
    );
    if (confirmed != true || actionBusy) return;
    await _runPurchase(offer, retry: false);
  }

  Future<void> _runPurchase(
    ParticipantOffer offer, {
    required bool retry,
  }) async {
    if (actionBusy) return;
    setState(() => actionBusy = true);
    try {
      if (retry) {
        await purchases.retry(widget.id, offer.kind);
      } else {
        await purchases.start(widget.id, offer.kind);
      }
      message('Opération confirmée. Vos droits ont été actualisés.');
      _reload();
    } on ApiException catch (error) {
      final canRetry =
          purchases.retryKey != null &&
          (error.kind == ApiErrorKind.network ||
              error.kind == ApiErrorKind.server);
      message(
        error.message,
        action: canRetry
            ? SnackBarAction(
                label: 'Réessayer',
                onPressed: () => _runPurchase(offer, retry: true),
              )
            : null,
      );
    } finally {
      if (mounted) setState(() => actionBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Formation')),
    body: FutureBuilder<Map<String, dynamic>>(
      future: detail,
      builder: (context, snapshot) {
        if (snapshot.hasError) return ErrorView(snapshot.error);
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final course = snapshot.data!;
        final offline = course['_offline'] == true;
        final rawStates = course['_chapterStates'] as Map? ?? {};
        final states = <int, String>{
          for (final entry in rawStates.entries)
            int.parse('${entry.key}'): '${entry.value}',
        };
        final offers = availableOffers(course);
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              course['titre'] as String,
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            Text((course['description'] as String?) ?? ''),
            if (course['inscrit'] == true && !offline) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: courseDownloadBusy
                    ? null
                    : () => downloadCourse(course),
                icon: const Icon(Icons.download_for_offline),
                label: Text(
                  courseDownloadBusy
                      ? 'Téléchargement en cours…'
                      : 'Télécharger le cours',
                ),
              ),
            ],
            if (offline)
              const Card(
                child: ListTile(
                  leading: Icon(Icons.cloud_off),
                  title: Text('Mode hors ligne'),
                  subtitle: Text(
                    'Les quiz, classes et mises à jour nécessitent une connexion.',
                  ),
                ),
              ),
            if (offers.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                'Choisissez votre accès',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              ...offers.map(
                (offer) => Card(
                  child: ListTile(
                    title: Text(offer.label),
                    subtitle: Text('${offer.price} ${offer.currency}'),
                    trailing: FilledButton(
                      onPressed: actionBusy ? null : () => selectOffer(offer),
                      child: const Text('Choisir'),
                    ),
                  ),
                ),
              ),
            ],
            ...(course['modules'] as List).map((rawModule) {
              final module = rawModule as Map;
              final moduleLocked = module['verrouille'] == true;
              return ExpansionTile(
                title: Text(module['titre'] as String),
                subtitle: Text(
                  moduleLocked
                      ? 'Verrouillé'
                      : module['apercuGratuit'] == true
                      ? 'Aperçu gratuit'
                      : 'Accessible',
                ),
                children: (module['chapitres'] as List).map<Widget>((
                  rawChapter,
                ) {
                  final chapter = rawChapter as Map;
                  final chapterId = chapter['id'] as int;
                  final state = states[chapterId];
                  final chapterLocked = chapter['verrouille'] == true;
                  final locked =
                      moduleLocked || chapterLocked || state == 'VERROUILLE';
                  final completionAllowed = canCompleteChapter(
                    moduleLocked: moduleLocked,
                    chapterLocked: chapterLocked,
                    journeyState: state,
                  );
                  final completed = state == 'TERMINE';
                  return ExpansionTile(
                    title: Text(chapter['titre'] as String),
                    subtitle: locked
                        ? const Text('Prérequis non satisfaits')
                        : completed
                        ? const Text('Terminé')
                        : null,
                    children: [
                      ...(chapter['ressources'] as List).map<Widget>((
                        rawResource,
                      ) {
                        final resource = rawResource as Map;
                        return FutureBuilder<OfflineResource?>(
                          future: widget.dependencies.offline.resource(
                            resource['id'] as int,
                          ),
                          builder: (context, localSnapshot) => ListTile(
                            enabled: !locked && resource['verrouille'] != true,
                            title: Text(resource['titre'] as String),
                            leading: Icon(
                              resource['type'] == 'PDF'
                                  ? Icons.picture_as_pdf
                                  : Icons.play_circle,
                            ),
                            subtitle: localSnapshot.hasData
                                ? const Text('Disponible hors ligne')
                                : null,
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (!offline && resource['type'] != 'YOUTUBE')
                                  IconButton(
                                    tooltip: 'Télécharger hors ligne',
                                    icon: const Icon(Icons.download),
                                    onPressed: locked
                                        ? null
                                        : () => downloadResource(resource),
                                  ),
                                Icon(
                                  localSnapshot.hasData
                                      ? Icons.offline_pin
                                      : Icons.open_in_new,
                                ),
                              ],
                            ),
                            onTap: () => openResource(resource),
                          ),
                        );
                      }),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton.icon(
                            onPressed: !completionAllowed
                                ? null
                                : () => completeChapter(chapterId),
                            icon: const Icon(Icons.check_circle_outline),
                            label: Text(
                              completed
                                  ? 'Chapitre terminé'
                                  : 'Marquer comme terminé',
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              );
            }),
          ],
        );
      },
    ),
  );
}

class ClassesPage extends StatelessWidget {
  const ClassesPage({required this.dependencies, super.key});

  final AppDependencies dependencies;

  @override
  Widget build(BuildContext context) => FutureBuilder(
    future: dependencies.api.call('/participant/classes'),
    builder: (context, snapshot) {
      if (snapshot.hasError) return ErrorView(snapshot.error);
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      final items = snapshot.data as List;
      if (items.isEmpty) {
        return const Center(child: Text('Aucune classe affectée.'));
      }
      return ListView(
        children: items.expand<Widget>((rawClass) {
          final virtualClass = rawClass as Map;
          return [
            ListTile(
              title: Text(virtualClass['nom'] as String),
              subtitle: Text(virtualClass['formation'] as String),
            ),
            ...(virtualClass['seances'] as List).map((rawSession) {
              final session = rawSession as Map;
              return ListTile(
                leading: const Icon(Icons.video_call),
                title: Text(session['titre'] as String),
                subtitle: Text(session['dateDebut'] as String),
                onTap: () async {
                  try {
                    final join =
                        await dependencies.api.call(
                              '/participant/seances/${session['id']}/join',
                            )
                            as Map;
                    final uri = Uri.tryParse(join['joinUrl'] as String? ?? '');
                    if (uri == null ||
                        !await dependencies.urlOpener.open(uri)) {
                      throw const ApiException(
                        ApiErrorKind.other,
                        'Impossible d’ouvrir la séance.',
                      );
                    }
                  } on ApiException catch (error) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(
                        context,
                      ).showSnackBar(SnackBar(content: Text(error.message)));
                    }
                  }
                },
              );
            }),
          ];
        }).toList(),
      );
    },
  );
}

class ErrorView extends StatelessWidget {
  const ErrorView(this.error, {super.key});

  final Object? error;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Semantics(
        liveRegion: true,
        child: Text(
          error is ApiException
              ? (error! as ApiException).message
              : 'Impossible de charger les données.',
          textAlign: TextAlign.center,
        ),
      ),
    ),
  );
}
