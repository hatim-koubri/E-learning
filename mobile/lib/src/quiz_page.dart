import 'package:flutter/material.dart';

import 'api_client.dart';
import 'nexa_design.dart';

class QuizPage extends StatefulWidget {
  const QuizPage({
    required this.api,
    required this.formationId,
    required this.quizId,
    super.key,
  });

  final ApiClient api;
  final int formationId;
  final int quizId;

  @override
  State<QuizPage> createState() => _QuizPageState();
}

class _QuizPageState extends State<QuizPage> {
  late Future<Map<String, dynamic>> quiz;
  final selected = <int, Set<int>>{};
  Map<String, dynamic>? result;
  bool submitting = false;

  @override
  void initState() {
    super.initState();
    quiz = load();
  }

  Future<Map<String, dynamic>> load() async => Map<String, dynamic>.from(
    await widget.api.call('/participant/quiz/${widget.quizId}') as Map,
  );

  Future<void> submit(Map<String, dynamic> data) async {
    final questions = data['questions'] as List;
    if (questions.any(
      (question) =>
          (selected[(question as Map)['id'] as int] ?? const {}).isEmpty,
    )) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Répondez à toutes les questions.')),
      );
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Envoyer cette tentative ?'),
        content: const Text(
          'Vos réponses seront corrigées par le serveur et cette tentative sera comptabilisée.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Vérifier mes réponses'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Envoyer'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => submitting = true);
    try {
      final response =
          await widget.api.call(
                '/participant/quiz/${widget.quizId}/tentatives',
                method: 'POST',
                body: {
                  'reponses': {
                    for (final entry in selected.entries)
                      '${entry.key}': entry.value.toList(),
                  },
                },
              )
              as Map;
      if (mounted) {
        setState(() => result = Map<String, dynamic>.from(response));
      }
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }

  void retry() {
    selected.clear();
    setState(() {
      result = null;
      quiz = load();
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Évaluation')),
    body: FutureBuilder<Map<String, dynamic>>(
      future: quiz,
      builder: (context, snapshot) {
        if (snapshot.hasError) return _QuizError(snapshot.error);
        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }
        final data = snapshot.data!;
        final questions = data['questions'] as List;
        final score = data['scoreMinimal'] ?? 0;
        if (result case final value?) return _resultView(value, data);
        return ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 30),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [NexaColors.primary, NexaColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(25),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  StatusPill(
                    data['important'] == true ? 'IMPORTANT' : 'QCM',
                    icon: Icons.quiz_rounded,
                    color: NexaColors.aqua,
                  ),
                  const SizedBox(height: 15),
                  Text(
                    '${data['titre']}',
                    style: Theme.of(
                      context,
                    ).textTheme.headlineMedium?.copyWith(color: Colors.white),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${questions.length} question(s) • Réussite à $score% • ${data['tentativesRestantes']} tentative(s)',
                    style: const TextStyle(color: Color(0xFFDCD8FF)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            ...questions.indexed.expand((entry) {
              final index = entry.$1;
              final question = entry.$2 as Map;
              final questionId = question['id'] as int;
              final answers = question['reponses'] as List;
              return <Widget>[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(18),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'QUESTION ${index + 1}/${questions.length}',
                          style: const TextStyle(
                            color: NexaColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            letterSpacing: .8,
                          ),
                        ),
                        const SizedBox(height: 9),
                        Text(
                          '${question['libelle']}',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        ...answers.map((rawAnswer) {
                          final answer = rawAnswer as Map;
                          final answerId = answer['id'] as int;
                          return CheckboxListTile(
                            contentPadding: EdgeInsets.zero,
                            controlAffinity: ListTileControlAffinity.leading,
                            title: Text('${answer['libelle']}'),
                            value:
                                selected[questionId]?.contains(answerId) ==
                                true,
                            onChanged: (checked) => setState(() {
                              final values = selected.putIfAbsent(
                                questionId,
                                () => <int>{},
                              );
                              checked == true
                                  ? values.add(answerId)
                                  : values.remove(answerId);
                            }),
                          );
                        }),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 14),
              ];
            }),
            FilledButton.icon(
              onPressed: submitting || data['tentativesRestantes'] == 0
                  ? null
                  : () => submit(data),
              icon: submitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.send_rounded),
              label: Text(submitting ? 'Correction…' : 'Envoyer mes réponses'),
            ),
          ],
        );
      },
    ),
  );

  Widget _resultView(
    Map<String, dynamic> value,
    Map<String, dynamic> quizData,
  ) {
    final passed = value['reussi'] == true;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 480),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(26),
              child: Column(
                children: [
                  Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      color: (passed ? NexaColors.aqua : NexaColors.coral)
                          .withValues(alpha: .12),
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: Icon(
                      passed
                          ? Icons.emoji_events_rounded
                          : Icons.replay_rounded,
                      size: 38,
                      color: passed ? NexaColors.aqua : NexaColors.coral,
                    ),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    passed ? 'Quiz réussi !' : 'Continuez vos efforts',
                    style: Theme.of(context).textTheme.headlineMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${value['pourcentage']}% obtenu • seuil ${quizData['scoreMinimal']}%',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  if ((value['chapitresARevoir'] as List?)?.isNotEmpty == true)
                    Padding(
                      padding: const EdgeInsets.only(top: 14),
                      child: Text(
                        'À revoir : ${(value['chapitresARevoir'] as List).map((item) => (item as Map)['titre']).join(', ')}',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                  const SizedBox(height: 22),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () => Navigator.pop(context, passed),
                      child: Text(
                        passed ? 'Continuer mon parcours' : 'Retour au cours',
                      ),
                    ),
                  ),
                  if (!passed && (quizData['tentativesRestantes'] as int) > 0)
                    TextButton.icon(
                      onPressed: retry,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Réessayer'),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _QuizError extends StatelessWidget {
  const _QuizError(this.error);
  final Object? error;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Text(
        error is ApiException
            ? (error! as ApiException).message
            : 'Impossible de charger ce quiz.',
        textAlign: TextAlign.center,
      ),
    ),
  );
}
