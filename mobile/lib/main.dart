import 'dart:async';

import 'package:flutter/material.dart';

import 'src/api_client.dart';
import 'src/participant_actions.dart';
import 'src/offline_library.dart';
import 'src/session.dart';
import 'src/nexa_design.dart';
import 'src/embedded_content.dart';
import 'src/checkout_sheet.dart';
import 'src/quiz_page.dart';
import 'src/certificate_page.dart';

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
  List<dynamic>? participantCourses;

  Future<void> restoreSession() async {
    if (!await session.loadStoredToken()) return;
    try {
      final restored = await api.call('/participant/formations');
      if (restored is List) participantCourses = restored;
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
    title: 'Khotwa',
    theme: nexaTheme(),
    debugShowCheckedModeBanner: false,
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
    body: Stack(
      children: [
        Positioned(
          top: -100,
          right: -90,
          child: Container(
            width: 280,
            height: 280,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: NexaColors.primary.withValues(alpha: .09),
            ),
          ),
        ),
        Positioned(
          top: 110,
          left: -75,
          child: Container(
            width: 180,
            height: 180,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: NexaColors.aqua.withValues(alpha: .08),
            ),
          ),
        ),
        SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: NexaLogo(),
                    ),
                    const SizedBox(height: 48),
                    Text(
                      'Bienvenue',
                      style: Theme.of(context).textTheme.headlineLarge,
                    ),
                    const SizedBox(height: 9),
                    Text(
                      'Retrouvez votre parcours et continuez à construire votre avenir.',
                      style: Theme.of(
                        context,
                      ).textTheme.bodyLarge?.copyWith(color: NexaColors.muted),
                    ),
                    const SizedBox(height: 30),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(22),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              'Connexion',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 20),
                            TextField(
                              controller: email,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.email],
                              decoration: const InputDecoration(
                                labelText: 'Adresse email',
                                prefixIcon: Icon(Icons.mail_outline_rounded),
                              ),
                            ),
                            const SizedBox(height: 14),
                            TextField(
                              controller: password,
                              obscureText: true,
                              autofillHints: const [AutofillHints.password],
                              onSubmitted: busy ? null : (_) => login(),
                              decoration: const InputDecoration(
                                labelText: 'Mot de passe',
                                prefixIcon: Icon(Icons.lock_outline_rounded),
                              ),
                            ),
                            if (widget.dependencies.session.message
                                case final message?)
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
                            const SizedBox(height: 20),
                            FilledButton(
                              onPressed: busy ? null : login,
                              child: busy
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Text('Se connecter'),
                                        SizedBox(width: 8),
                                        Icon(
                                          Icons.arrow_forward_rounded,
                                          size: 19,
                                        ),
                                      ],
                                    ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 22),
                    const Wrap(
                      alignment: WrapAlignment.center,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 7,
                      children: [
                        Icon(
                          Icons.verified_user_outlined,
                          size: 16,
                          color: NexaColors.muted,
                        ),
                        Text(
                          'Connexion sécurisée à votre espace',
                          style: TextStyle(
                            fontSize: 12,
                            color: NexaColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
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
    widget.dependencies.participantCourses = null;
    await widget.dependencies.session.logout();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const NexaLogo(),
      actions: [
        IconButton(
          tooltip: 'Notifications',
          icon: const Badge(
            smallSize: 7,
            child: Icon(Icons.notifications_none_rounded),
          ),
          onPressed: () {},
        ),
        IconButton(
          tooltip: 'Se déconnecter',
          icon: const Icon(Icons.logout_rounded),
          onPressed: logout,
        ),
      ],
    ),
    body: [
      CataloguePage(dependencies: widget.dependencies),
      MyCoursesPage(dependencies: widget.dependencies),
      DownloadsPage(dependencies: widget.dependencies),
      ClassesPage(dependencies: widget.dependencies),
    ][tab],
    bottomNavigationBar: NavigationBar(
      selectedIndex: tab,
      onDestinationSelected: (value) => setState(() => tab = value),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.search),
          selectedIcon: Icon(Icons.search),
          label: 'Catalogue',
        ),
        NavigationDestination(
          icon: Icon(Icons.auto_stories_outlined),
          selectedIcon: Icon(Icons.auto_stories_rounded),
          label: 'Mes formations',
        ),
        NavigationDestination(
          icon: Icon(Icons.download_for_offline_outlined),
          selectedIcon: Icon(Icons.download_for_offline_rounded),
          label: 'Téléchargés',
        ),
        NavigationDestination(
          icon: Icon(Icons.video_camera_front_outlined),
          selectedIcon: Icon(Icons.video_camera_front_rounded),
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
        final catalogue =
            await widget.dependencies.api.call(
                  '/catalogue?q=${Uri.encodeQueryComponent(search.text)}&size=20',
                )
                as Map;
        final enrolled =
            widget.dependencies.participantCourses ??
            await widget.dependencies.api.call('/participant/formations')
                as List;
        widget.dependencies.participantCourses = enrolled;
        final enrolledById = <int, Map>{
          for (final rawItem in enrolled)
            if ((rawItem as Map)['formationId'] is int)
              rawItem['formationId'] as int: rawItem,
        };
        for (final rawItem in catalogue['content'] as List) {
          final item = rawItem as Map;
          final enrollment = enrolledById[item['id']];
          item['inscrit'] = enrollment != null;
          if (enrollment != null) {
            item['progression'] = enrollment['progression'];
          }
        }
        (catalogue['content'] as List).sort(
          (left, right) => compareCourseOrder(left as Map, right as Map),
        );
        completer.complete(catalogue);
      } catch (error, stackTrace) {
        completer.completeError(error, stackTrace);
      }
    });
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 22),
        decoration: const BoxDecoration(color: NexaColors.canvas),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Apprenez sans limites',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 6),
            Text(
              'Des compétences concrètes pour votre prochain chapitre.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 18),
            TextField(
              controller: search,
              onSubmitted: (_) => load(),
              decoration: InputDecoration(
                hintText: 'Que souhaitez-vous apprendre ?',
                prefixIcon: const Icon(Icons.manage_search_rounded),
                suffixIcon: IconButton(
                  onPressed: load,
                  icon: const Icon(Icons.search),
                ),
              ),
            ),
          ],
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
            if (items.isEmpty) {
              return const PremiumEmptyState(
                icon: Icons.travel_explore_rounded,
                title: 'Aucun résultat',
                message:
                    'Essayez un autre mot-clé pour découvrir votre prochaine formation.',
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              itemCount: items.length,
              separatorBuilder: (_, _) => const SizedBox(height: 14),
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
  Widget build(BuildContext context) {
    final category = '${course['categorie'] ?? 'Formation'}';
    final price = course['prix'] ?? 0;
    final enrolled = course['inscrit'] == true || course['formationId'] != null;
    final progressValue =
        course['progression'] ?? course['pourcentageProgression'];
    final progress = progressValue is num
        ? (progressValue.toDouble() / (progressValue > 1 ? 100 : 1)).clamp(
            0.0,
            1.0,
          )
        : null;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CoursePage(
              id: (course['formationId'] ?? course['id']) as int,
              dependencies: dependencies,
            ),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 92,
                height: 104,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [NexaColors.primary, NexaColors.primaryDark],
                  ),
                ),
                child: Stack(
                  children: [
                    Positioned(
                      right: -15,
                      bottom: -18,
                      child: Icon(
                        Icons.school_rounded,
                        size: 80,
                        color: Colors.white.withValues(alpha: .12),
                      ),
                    ),
                    const Center(
                      child: Icon(
                        Icons.play_circle_fill_rounded,
                        color: Colors.white,
                        size: 34,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: [
                        StatusPill(category, color: NexaColors.aqua),
                        if (enrolled)
                          StatusPill(
                            (progress ?? 0) >= 1 ? 'TERMINÉE' : 'EN COURS',
                            icon: (progress ?? 0) >= 1
                                ? Icons.workspace_premium_rounded
                                : Icons.play_circle_fill_rounded,
                            color: (progress ?? 0) >= 1
                                ? NexaColors.aqua
                                : NexaColors.primary,
                          ),
                      ],
                    ),
                    const SizedBox(height: 9),
                    Text(
                      '${course['titre']}',
                      style: Theme.of(context).textTheme.titleMedium,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 10),
                    if (progress != null) ...[
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: LinearProgressIndicator(
                                value: progress,
                                minHeight: 6,
                                backgroundColor: NexaColors.line,
                                color: NexaColors.aqua,
                              ),
                            ),
                          ),
                          const SizedBox(width: 9),
                          Text(
                            '${(progress * 100).round()}%',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: NexaColors.aqua,
                            ),
                          ),
                        ],
                      ),
                    ] else if (enrolled)
                      const Row(
                        children: [
                          Icon(
                            Icons.play_arrow_rounded,
                            size: 18,
                            color: NexaColors.primary,
                          ),
                          SizedBox(width: 5),
                          Text(
                            'Continuer',
                            style: TextStyle(
                              fontWeight: FontWeight.w800,
                              color: NexaColors.primary,
                            ),
                          ),
                          Spacer(),
                          Icon(
                            Icons.arrow_forward_rounded,
                            size: 18,
                            color: NexaColors.primary,
                          ),
                        ],
                      )
                    else
                      Row(
                        children: [
                          const Icon(
                            Icons.workspace_premium_outlined,
                            size: 16,
                            color: NexaColors.coral,
                          ),
                          const SizedBox(width: 5),
                          Text(
                            '$price DH',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              color: NexaColors.ink,
                            ),
                          ),
                          const Spacer(),
                          const Icon(
                            Icons.arrow_forward_rounded,
                            size: 18,
                            color: NexaColors.primary,
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

double courseProgress(Map course) {
  final raw = course['progression'] ?? course['pourcentageProgression'];
  if (raw is! num) return 0;
  return (raw.toDouble() / (raw > 1 ? 100 : 1)).clamp(0.0, 1.0);
}

int courseOrderRank(Map course) {
  if (course['inscrit'] != true && course['formationId'] == null) return 0;
  return courseProgress(course) >= 1 ? 2 : 1;
}

int compareCourseOrder(Map left, Map right) {
  final rank = courseOrderRank(left).compareTo(courseOrderRank(right));
  if (rank != 0) return rank;
  if (courseOrderRank(left) == 1) {
    return courseProgress(right).compareTo(courseProgress(left));
  }
  return '${left['titre']}'.compareTo('${right['titre']}');
}

class MyCoursesPage extends StatelessWidget {
  const MyCoursesPage({required this.dependencies, super.key});

  final AppDependencies dependencies;

  Future<List<dynamic>> load() async {
    try {
      final items =
          await dependencies.api.call('/participant/formations') as List;
      dependencies.participantCourses = items;
      return items;
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
      final items = List<dynamic>.from(snapshot.data as List)
        ..sort((left, right) => compareCourseOrder(left as Map, right as Map));
      if (items.isEmpty) {
        return const PremiumEmptyState(
          icon: Icons.auto_stories_outlined,
          title: 'Votre parcours commence ici',
          message:
              'Inscrivez-vous à une formation du catalogue pour la retrouver dans cet espace.',
        );
      }
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        children: items
            .map(
              (item) => CourseTile(
                Map<String, dynamic>.from(item as Map),
                dependencies: dependencies,
              ),
            )
            .expand((widget) => [widget, const SizedBox(height: 14)])
            .toList(),
      );
    },
  );
}

class DownloadsPage extends StatefulWidget {
  const DownloadsPage({required this.dependencies, super.key});

  final AppDependencies dependencies;

  @override
  State<DownloadsPage> createState() => _DownloadsPageState();
}

class _DownloadsPageState extends State<DownloadsPage> {
  late Future<List<Map<String, dynamic>>> courses;

  @override
  void initState() {
    super.initState();
    courses = widget.dependencies.offline.installedCourses();
  }

  void reload() =>
      setState(() => courses = widget.dependencies.offline.installedCourses());

  Future<void> uninstall(Map<String, dynamic> course) async {
    final id = (course['formationId'] ?? course['id']) as int;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer le téléchargement ?'),
        content: Text(
          '« ${course['titre']} » et ses ressources hors ligne seront supprimés de cet appareil.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await widget.dependencies.offline.uninstallCourse(id);
    reload();
  }

  @override
  Widget build(
    BuildContext context,
  ) => FutureBuilder<List<Map<String, dynamic>>>(
    future: courses,
    builder: (context, snapshot) {
      if (snapshot.hasError) return ErrorView(snapshot.error);
      if (!snapshot.hasData) {
        return const Center(child: CircularProgressIndicator());
      }
      final items = snapshot.data!;
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
        children: [
          Card(
            color: NexaColors.primary,
            child: InkWell(
              borderRadius: BorderRadius.circular(22),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => CertificatesPage(
                    api: widget.dependencies.api,
                    offline: widget.dependencies.offline,
                  ),
                ),
              ),
              child: const Padding(
                padding: EdgeInsets.all(18),
                child: Row(
                  children: [
                    Icon(
                      Icons.workspace_premium_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                    SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mes certificats',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 17,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Voir et télécharger mes réussites',
                            style: TextStyle(color: Color(0xFFDCD8FF)),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_rounded, color: Colors.white),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          const SectionHeader(
            'Apprendre hors ligne',
            subtitle: 'Vos cours installés sur cet appareil',
          ),
          const SizedBox(height: 16),
          if (items.isEmpty)
            const PremiumEmptyState(
              icon: Icons.download_for_offline_outlined,
              title: 'Aucun cours téléchargé',
              message:
                  'Ouvrez une formation et appuyez sur « Installer le cours » pour apprendre sans connexion.',
            ),
          ...items.expand(
            (course) => <Widget>[
              Stack(
                children: [
                  CourseTile(course, dependencies: widget.dependencies),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: IconButton.filledTonal(
                      tooltip: 'Supprimer de cet appareil',
                      onPressed: () => uninstall(course),
                      icon: const Icon(Icons.delete_outline_rounded, size: 19),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
            ],
          ),
        ],
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
  Map<int, String> chapterStates = {};
  Map<String, dynamic>? evaluations;

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
      final rawStates = cached['_chapterStates'] as Map? ?? {};
      chapterStates = {
        for (final entry in rawStates.entries)
          int.parse('${entry.key}'): '${entry.value}',
      };
      return cached;
    }
    if (course['inscrit'] == true) {
      final responses = await Future.wait([
        widget.dependencies.api.call(
          '/participant/formations/${widget.id}/parcours',
        ),
        widget.dependencies.api.call(
          '/participant/formations/${widget.id}/evaluations',
        ),
      ]);
      final journey = responses[0] as Map;
      chapterStates = {};
      for (final module in journey['modules'] as List) {
        for (final chapter in (module as Map)['chapitres'] as List) {
          final item = chapter as Map;
          chapterStates[item['id'] as int] = item['etat'] as String;
        }
      }
      evaluations = Map<String, dynamic>.from(responses[1] as Map);
    }
    course['_chapterStates'] = chapterStates.map(
      (key, value) => MapEntry('$key', value),
    );
    if (course['inscrit'] == true) {
      final existing = await widget.dependencies.offline.course(widget.id);
      if (existing?['_installed'] == true) {
        course['_installed'] = true;
        course['_installedAt'] = existing?['_installedAt'];
      }
      await widget.dependencies.offline.cacheCourse(widget.id, course);
    }
    return course;
  }

  void _reload() => setState(() => detail = _load());

  Future<void> refreshLearningState() async {
    final responses = await Future.wait([
      widget.dependencies.api.call(
        '/participant/formations/${widget.id}/parcours',
      ),
      widget.dependencies.api.call(
        '/participant/formations/${widget.id}/evaluations',
      ),
    ]);
    final refreshed = <int, String>{};
    for (final module in (responses[0] as Map)['modules'] as List) {
      for (final chapter in (module as Map)['chapitres'] as List) {
        final item = chapter as Map;
        refreshed[item['id'] as int] = item['etat'] as String;
      }
    }
    if (!mounted) return;
    setState(() {
      chapterStates = refreshed;
      evaluations = Map<String, dynamic>.from(responses[1] as Map);
    });
  }

  Map? quizForModule(int moduleId) {
    final quizzes = evaluations?['quizModules'] as List? ?? const [];
    for (final rawQuiz in quizzes) {
      final quiz = rawQuiz as Map;
      if (quiz['moduleId'] == moduleId) return quiz;
    }
    return null;
  }

  Future<void> openQuiz(Map quiz) async {
    if (quiz['etat'] == 'VERROUILLE') {
      message('Terminez les chapitres requis avant ce quiz.');
      return;
    }
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => QuizPage(
          api: widget.dependencies.api,
          formationId: widget.id,
          quizId: quiz['id'] as int,
        ),
      ),
    );
    try {
      await refreshLearningState();
    } on ApiException catch (error) {
      message(error.message);
    }
  }

  void message(String value, {SnackBarAction? action}) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(value), action: action));
  }

  Future<void> openResource(
    Map resource, {
    required int chapterId,
    required bool completed,
  }) async {
    try {
      final local = await widget.dependencies.offline.resource(
        resource['id'] as int,
      );
      if (local != null) {
        if (!mounted) return;
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => EmbeddedContentPage(
              title: local.title,
              type: local.type,
              localPath: local.path,
              initiallyCompleted: completed,
              onComplete: () =>
                  completeChapter(chapterId, askConfirmation: false),
            ),
          ),
        );
        return;
      }
      final access =
          await widget.dependencies.api.call(
                '/catalogue/${widget.id}/ressources/${resource['id']}/acces',
              )
              as Map;
      final uri = Uri.tryParse(access['url'] as String? ?? '');
      if (uri == null) {
        throw const ApiException(
          ApiErrorKind.other,
          'Adresse de ressource invalide.',
        );
      }
      if (!mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => EmbeddedContentPage(
            title: (access['titre'] ?? resource['titre']) as String,
            type: (access['type'] ?? resource['type']) as String,
            uri: uri,
            initiallyCompleted: completed,
            onComplete: () =>
                completeChapter(chapterId, askConfirmation: false),
          ),
        ),
      );
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
      await widget.dependencies.offline.installCourse(widget.id, course);
      course['_installed'] = true;
      message(
        downloaded > 0
            ? '$downloaded ressource(s) téléchargée(s). Le cours est installé.'
            : alreadyAvailable > 0
            ? 'Ce cours est déjà disponible hors ligne.'
            : 'Cours installé. Les ressources non téléchargeables nécessiteront une connexion.',
      );
      if (mounted) setState(() {});
    } on ApiException catch (error) {
      message('$downloaded ressource(s) enregistrée(s). ${error.message}');
    } finally {
      if (mounted) setState(() => courseDownloadBusy = false);
    }
  }

  Future<bool> completeChapter(
    int chapterId, {
    bool askConfirmation = true,
  }) async {
    var confirmed = true;
    if (askConfirmation) {
      confirmed =
          await showDialog<bool>(
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
          ) ??
          false;
    }
    if (!confirmed) return false;
    try {
      await resources.completeChapter(widget.id, chapterId);
      if (mounted) {
        setState(() => chapterStates[chapterId] = 'TERMINE');
      }
      message('Chapitre marqué comme terminé.');
      await refreshLearningState();
      return true;
    } on ApiException catch (error) {
      message(error.message);
      return false;
    }
  }

  Future<void> selectOffer(ParticipantOffer offer) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) => CheckoutSheet(offer: offer),
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
        final states = chapterStates;
        final allChapters = (course['modules'] as List)
            .expand((module) => (module as Map)['chapitres'] as List)
            .map((chapter) => chapter as Map)
            .toList();
        final completedCount = allChapters
            .where((chapter) => states[chapter['id']] == 'TERMINE')
            .length;
        final currentChapter = allChapters.cast<Map?>().firstWhere((chapter) {
          final state = states[chapter?['id']];
          return state != 'TERMINE' && state != 'VERROUILLE';
        }, orElse: () => null);
        final learningProgress = allChapters.isEmpty
            ? 0.0
            : completedCount / allChapters.length;
        final offers = availableOffers(course);
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(28),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [NexaColors.primary, NexaColors.primaryDark],
                ),
                boxShadow: [
                  BoxShadow(
                    color: NexaColors.primary.withValues(alpha: .22),
                    blurRadius: 28,
                    offset: const Offset(0, 14),
                  ),
                ],
              ),
              child: Stack(
                children: [
                  Positioned(
                    right: -28,
                    bottom: -35,
                    child: Icon(
                      Icons.auto_stories_rounded,
                      size: 150,
                      color: Colors.white.withValues(alpha: .08),
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      StatusPill(
                        offline
                            ? 'HORS LIGNE'
                            : (course['categorie']?.toString() ?? 'FORMATION'),
                        icon: offline
                            ? Icons.cloud_off_rounded
                            : Icons.bolt_rounded,
                        color: offline ? NexaColors.coral : NexaColors.aqua,
                      ),
                      const SizedBox(height: 18),
                      Text(
                        course['titre'] as String,
                        style: Theme.of(context).textTheme.headlineMedium
                            ?.copyWith(color: Colors.white),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        (course['description'] as String?) ?? '',
                        maxLines: 4,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Color(0xFFDCD8FF),
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (course['inscrit'] == true && !offline) ...[
              const SizedBox(height: 18),
              FilledButton.icon(
                onPressed: courseDownloadBusy
                    ? null
                    : () => downloadCourse(course),
                icon: const Icon(Icons.download_for_offline),
                label: Text(
                  courseDownloadBusy
                      ? 'Téléchargement en cours…'
                      : course['_installed'] == true
                      ? 'Mettre à jour le cours hors ligne'
                      : 'Installer le cours',
                ),
              ),
            ],
            if (course['inscrit'] == true) ...[
              const SizedBox(height: 16),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Votre progression',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const Spacer(),
                          Text(
                            '${(learningProgress * 100).round()}%',
                            style: const TextStyle(
                              color: NexaColors.primary,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: learningProgress,
                          minHeight: 9,
                          backgroundColor: NexaColors.line,
                          color: NexaColors.aqua,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(
                            Icons.my_location_rounded,
                            size: 19,
                            color: NexaColors.primary,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              currentChapter == null
                                  ? 'Tous les chapitres sont terminés.'
                                  : 'À continuer : ${currentChapter['titre']}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                color: NexaColors.ink,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
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
              const SizedBox(height: 24),
              const SectionHeader(
                'Choisissez votre accès',
                subtitle: 'Une formule adaptée à votre façon d’apprendre',
              ),
              const SizedBox(height: 12),
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
            const SizedBox(height: 26),
            const SectionHeader(
              'Programme du cours',
              subtitle: 'Progressez étape par étape, à votre rythme',
            ),
            const SizedBox(height: 12),
            ...(course['modules'] as List).map((rawModule) {
              final module = rawModule as Map;
              final moduleLocked = module['verrouille'] == true;
              final moduleQuiz = quizForModule(module['id'] as int);
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Card(
                  child: ExpansionTile(
                    shape: const Border(),
                    collapsedShape: const Border(),
                    leading: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color:
                            (moduleLocked
                                    ? NexaColors.muted
                                    : NexaColors.primary)
                                .withValues(alpha: .1),
                        borderRadius: BorderRadius.circular(13),
                      ),
                      child: Icon(
                        moduleLocked
                            ? Icons.lock_outline_rounded
                            : Icons.layers_outlined,
                        color: moduleLocked
                            ? NexaColors.muted
                            : NexaColors.primary,
                      ),
                    ),
                    title: Text(
                      module['titre'] as String,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            moduleLocked
                                ? 'Verrouillé'
                                : module['apercuGratuit'] == true
                                ? 'Aperçu gratuit'
                                : '${(module['chapitres'] as List).length} chapitre(s)',
                          ),
                          if (moduleQuiz != null) ...[
                            const SizedBox(height: 7),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  moduleQuiz['etat'] == 'REUSSI'
                                      ? Icons.check_circle_rounded
                                      : moduleQuiz['etat'] == 'VERROUILLE'
                                      ? Icons.lock_outline_rounded
                                      : Icons.quiz_rounded,
                                  size: 16,
                                  color: moduleQuiz['etat'] == 'REUSSI'
                                      ? NexaColors.aqua
                                      : moduleQuiz['etat'] == 'VERROUILLE'
                                      ? NexaColors.muted
                                      : NexaColors.coral,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  moduleQuiz['etat'] == 'REUSSI'
                                      ? 'Quiz réussi'
                                      : moduleQuiz['etat'] == 'VERROUILLE'
                                      ? 'Quiz verrouillé'
                                      : 'Quiz à passer',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: moduleQuiz['etat'] == 'REUSSI'
                                        ? NexaColors.aqua
                                        : moduleQuiz['etat'] == 'VERROUILLE'
                                        ? NexaColors.muted
                                        : NexaColors.coral,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    children: [
                      ...(module['chapitres'] as List).map<Widget>((
                        rawChapter,
                      ) {
                        final chapter = rawChapter as Map;
                        final chapterId = chapter['id'] as int;
                        final state = states[chapterId];
                        final chapterLocked = chapter['verrouille'] == true;
                        final locked =
                            moduleLocked ||
                            chapterLocked ||
                            state == 'VERROUILLE';
                        final completionAllowed = canCompleteChapter(
                          moduleLocked: moduleLocked,
                          chapterLocked: chapterLocked,
                          journeyState: state,
                        );
                        final completed = state == 'TERMINE';
                        final isCurrent = currentChapter?['id'] == chapterId;
                        return Container(
                          margin: const EdgeInsets.fromLTRB(10, 3, 10, 6),
                          decoration: BoxDecoration(
                            color: isCurrent
                                ? NexaColors.primary.withValues(alpha: .07)
                                : completed
                                ? NexaColors.aqua.withValues(alpha: .05)
                                : Colors.transparent,
                            borderRadius: BorderRadius.circular(16),
                            border: isCurrent
                                ? Border.all(
                                    color: NexaColors.primary.withValues(
                                      alpha: .28,
                                    ),
                                  )
                                : null,
                          ),
                          child: ExpansionTile(
                            key: ValueKey('chapter-$chapterId-$state'),
                            initiallyExpanded: isCurrent,
                            leading: Icon(
                              completed
                                  ? Icons.check_circle_rounded
                                  : locked
                                  ? Icons.lock_outline_rounded
                                  : isCurrent
                                  ? Icons.play_circle_fill_rounded
                                  : Icons.radio_button_unchecked_rounded,
                              color: completed
                                  ? NexaColors.aqua
                                  : locked
                                  ? NexaColors.muted
                                  : NexaColors.primary,
                            ),
                            title: Text(chapter['titre'] as String),
                            subtitle: locked
                                ? const Text('Prérequis non satisfaits')
                                : completed
                                ? const Text('Terminé')
                                : isCurrent
                                ? const Text(
                                    'Vous êtes ici • à terminer',
                                    style: TextStyle(
                                      color: NexaColors.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  )
                                : const Text('Disponible'),
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
                                    enabled:
                                        !locked &&
                                        resource['verrouille'] != true,
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
                                        if (!offline &&
                                            resource['type'] != 'YOUTUBE')
                                          IconButton(
                                            tooltip: 'Télécharger hors ligne',
                                            icon: const Icon(Icons.download),
                                            onPressed: locked
                                                ? null
                                                : () => downloadResource(
                                                    resource,
                                                  ),
                                          ),
                                        Icon(
                                          localSnapshot.hasData
                                              ? Icons.offline_pin
                                              : Icons.open_in_new,
                                        ),
                                      ],
                                    ),
                                    onTap: () => openResource(
                                      resource,
                                      chapterId: chapterId,
                                      completed: completed,
                                    ),
                                  ),
                                );
                              }),
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  4,
                                  16,
                                  12,
                                ),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: OutlinedButton.icon(
                                    onPressed: !completionAllowed
                                        ? null
                                        : () => completeChapter(chapterId),
                                    icon: const Icon(
                                      Icons.check_circle_outline,
                                    ),
                                    label: Text(
                                      completed
                                          ? 'Chapitre terminé'
                                          : 'Marquer comme terminé',
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                      if (moduleQuiz != null)
                        Padding(
                          padding: const EdgeInsets.fromLTRB(12, 8, 12, 14),
                          child: Card(
                            color: moduleQuiz['etat'] == 'REUSSI'
                                ? NexaColors.aqua.withValues(alpha: .08)
                                : NexaColors.primary.withValues(alpha: .06),
                            child: ListTile(
                              leading: Icon(
                                moduleQuiz['etat'] == 'REUSSI'
                                    ? Icons.emoji_events_rounded
                                    : moduleQuiz['etat'] == 'VERROUILLE'
                                    ? Icons.lock_outline_rounded
                                    : Icons.quiz_rounded,
                                color: moduleQuiz['etat'] == 'REUSSI'
                                    ? NexaColors.aqua
                                    : NexaColors.primary,
                              ),
                              title: Text('${moduleQuiz['titre']}'),
                              subtitle: Text(
                                moduleQuiz['etat'] == 'REUSSI'
                                    ? 'Quiz réussi'
                                    : moduleQuiz['etat'] == 'VERROUILLE'
                                    ? 'Terminez le module pour le débloquer'
                                    : 'Quiz du module • passer maintenant',
                              ),
                              trailing: const Icon(Icons.chevron_right_rounded),
                              onTap: () => openQuiz(moduleQuiz),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              );
            }),
            if (evaluations?['quizFinal'] case final Map finalQuiz) ...[
              const SizedBox(height: 8),
              const SectionHeader(
                'Évaluation finale',
                subtitle: 'Validez toutes vos compétences',
              ),
              const SizedBox(height: 12),
              Card(
                color: finalQuiz['etat'] == 'REUSSI'
                    ? NexaColors.aqua.withValues(alpha: .08)
                    : Colors.white,
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: NexaColors.coral.withValues(alpha: .11),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: Icon(
                      finalQuiz['etat'] == 'REUSSI'
                          ? Icons.emoji_events_rounded
                          : finalQuiz['etat'] == 'VERROUILLE'
                          ? Icons.lock_outline_rounded
                          : Icons.military_tech_rounded,
                      color: NexaColors.coral,
                    ),
                  ),
                  title: Text(
                    '${finalQuiz['titre']}',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 5),
                    child: Text(
                      finalQuiz['etat'] == 'REUSSI'
                          ? 'Évaluation réussie'
                          : finalQuiz['etat'] == 'VERROUILLE'
                          ? 'Terminez le parcours et les quiz de modules'
                          : 'Disponible maintenant',
                    ),
                  ),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => openQuiz(finalQuiz),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                '${evaluations?['evaluationsReussies'] ?? 0}/${evaluations?['evaluationsObligatoires'] ?? 0} évaluations réussies',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (evaluations?['certificatDisponible'] == true) ...[
              const SizedBox(height: 16),
              Card(
                color: NexaColors.aqua.withValues(alpha: .09),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  leading: const Icon(
                    Icons.workspace_premium_rounded,
                    color: NexaColors.aqua,
                    size: 38,
                  ),
                  title: const Text(
                    'Votre certificat est disponible',
                    style: TextStyle(fontWeight: FontWeight.w900),
                  ),
                  subtitle: const Padding(
                    padding: EdgeInsets.only(top: 4),
                    child: Text('Téléchargez ou consultez votre réussite.'),
                  ),
                  trailing: const Icon(Icons.arrow_forward_rounded),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => CertificatesPage(
                        api: widget.dependencies.api,
                        offline: widget.dependencies.offline,
                      ),
                    ),
                  ),
                ),
              ),
            ],
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
        return const PremiumEmptyState(
          icon: Icons.video_camera_front_outlined,
          title: 'Aucune classe planifiée',
          message:
              'Vos prochaines sessions en direct apparaîtront ici dès leur programmation.',
        );
      }
      return ListView(
        padding: const EdgeInsets.fromLTRB(20, 10, 20, 28),
        children: [
          const SectionHeader(
            'Sessions en direct',
            subtitle: 'Apprenez, échangez et avancez ensemble',
          ),
          const SizedBox(height: 16),
          ...items.expand<Widget>((rawClass) {
            final virtualClass = rawClass as Map;
            return [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: NexaColors.coral.withValues(alpha: .11),
                              borderRadius: BorderRadius.circular(15),
                            ),
                            child: const Icon(
                              Icons.groups_2_outlined,
                              color: NexaColors.coral,
                            ),
                          ),
                          const SizedBox(width: 13),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  virtualClass['nom'] as String,
                                  style: Theme.of(
                                    context,
                                  ).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  virtualClass['formation'] as String,
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ],
                            ),
                          ),
                          const StatusPill(
                            'LIVE',
                            icon: Icons.circle,
                            color: NexaColors.coral,
                          ),
                        ],
                      ),
                      const SizedBox(height: 15),
                      ...(virtualClass['seances'] as List).map((rawSession) {
                        final session = rawSession as Map;
                        return Container(
                          margin: const EdgeInsets.only(top: 8),
                          decoration: BoxDecoration(
                            color: NexaColors.canvas,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: Colors.white,
                              child: Icon(
                                Icons.videocam_rounded,
                                color: NexaColors.primary,
                              ),
                            ),
                            title: Text(
                              session['titre'] as String,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 3),
                              child: Text(session['dateDebut'] as String),
                            ),
                            trailing: const Icon(
                              Icons.arrow_forward_rounded,
                              color: NexaColors.primary,
                            ),
                            onTap: () async {
                              try {
                                final join =
                                    await dependencies.api.call(
                                          '/participant/seances/${session['id']}/join',
                                        )
                                        as Map;
                                final uri = Uri.tryParse(
                                  join['joinUrl'] as String? ?? '',
                                );
                                if (uri == null) {
                                  throw const ApiException(
                                    ApiErrorKind.other,
                                    'Impossible d’ouvrir la séance.',
                                  );
                                }
                                if (!context.mounted) return;
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => EmbeddedContentPage(
                                      title: session['titre'] as String,
                                      type: 'MEETING',
                                      uri: uri,
                                      isMeeting: true,
                                    ),
                                  ),
                                );
                              } on ApiException catch (error) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(error.message)),
                                  );
                                }
                              }
                            },
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ];
          }),
        ],
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
