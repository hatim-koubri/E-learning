import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';
import 'package:http/http.dart' as http;
import 'package:jitsi_meet_flutter_sdk/jitsi_meet_flutter_sdk.dart';
import 'package:path_provider/path_provider.dart';
import 'package:video_player/video_player.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'nexa_design.dart';

class EmbeddedContentPage extends StatelessWidget {
  const EmbeddedContentPage({
    required this.title,
    required this.type,
    this.uri,
    this.localPath,
    this.isMeeting = false,
    this.onComplete,
    this.initiallyCompleted = false,
    super.key,
  }) : assert(uri != null || localPath != null);

  final String title;
  final String type;
  final Uri? uri;
  final String? localPath;
  final bool isMeeting;
  final Future<bool> Function()? onComplete;
  final bool initiallyCompleted;

  @override
  Widget build(BuildContext context) {
    final normalized = type.toUpperCase();
    final target = uri == null ? null : mobileNetworkTarget(uri!);
    Widget content;
    if (normalized == 'VIDEO' && localPath != null) {
      content = NexaVideoPlayer(title: title, localPath: localPath);
    } else if (normalized == 'VIDEO' && uri != null) {
      content = NexaVideoPlayer(
        title: title,
        uri: target!.uri,
        httpHeaders: target.headers,
      );
    } else if (normalized == 'PDF') {
      content = NexaPdfViewer(
        localPath: localPath,
        uri: target?.uri,
        httpHeaders: target?.headers ?? const {},
      );
    } else if (normalized == 'IMAGE') {
      content = InteractiveViewer(
        minScale: .8,
        maxScale: 5,
        child: Center(
          child: localPath != null
              ? Image.file(File(localPath!))
              : Image.network(target!.uri.toString(), headers: target.headers),
        ),
      );
    } else if (isMeeting) {
      content = NexaMeeting(uri: uri!, title: title);
    } else {
      content = NexaWebContent(uri: _embeddableUri(uri!), isMeeting: isMeeting);
    }
    return Scaffold(
      backgroundColor: const Color(0xFF090B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090B12),
        foregroundColor: Colors.white,
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: content,
      bottomNavigationBar:
          onComplete != null && {'VIDEO', 'YOUTUBE'}.contains(normalized)
          ? ContentCompletionBar(
              onComplete: onComplete!,
              initiallyCompleted: initiallyCompleted,
            )
          : null,
    );
  }
}

class NexaMeeting extends StatefulWidget {
  const NexaMeeting({required this.uri, required this.title, super.key});

  final Uri uri;
  final String title;

  @override
  State<NexaMeeting> createState() => _NexaMeetingState();
}

class _NexaMeetingState extends State<NexaMeeting> {
  final JitsiMeet jitsi = JitsiMeet();
  bool opening = true;
  bool closed = false;
  String? error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => join());
  }

  Future<void> join() async {
    final room = widget.uri.pathSegments
        .where((segment) => segment.isNotEmpty)
        .firstOrNull;
    if (room == null) {
      setState(() {
        opening = false;
        error = 'Lien de séance invalide.';
      });
      return;
    }

    final displayName = _meetingDisplayName(widget.uri);
    final serverUrl = widget.uri.replace(path: '', query: null, fragment: null);
    try {
      await jitsi.join(
        JitsiMeetConferenceOptions(
          serverURL: serverUrl.toString(),
          room: room,
          configOverrides: const {
            'prejoinPageEnabled': false,
            'prejoinConfig.enabled': false,
            'requireDisplayName': false,
            'disableDeepLinking': true,
          },
          featureFlags: const {
            'welcomepage.enabled': false,
            'invite.enabled': false,
          },
          userInfo: JitsiMeetUserInfo(displayName: displayName),
        ),
        JitsiMeetEventListener(
          conferenceJoined: (_) {
            if (mounted) setState(() => opening = false);
          },
          conferenceTerminated: (_, eventError) => close(eventError),
          readyToClose: () => close(null),
        ),
      );
    } catch (exception) {
      if (!mounted) return;
      setState(() {
        opening = false;
        error = 'Impossible de rejoindre la séance. $exception';
      });
    }
  }

  void close(Object? eventError) {
    if (closed) return;
    closed = true;
    if (!mounted) return;
    Navigator.maybePop(context, eventError == null);
  }

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (opening) ...[
            const CircularProgressIndicator(color: NexaColors.aqua),
            const SizedBox(height: 18),
            const Text(
              'Connexion à la classe virtuelle…',
              style: TextStyle(color: Colors.white, fontSize: 16),
            ),
          ] else if (error != null) ...[
            const Icon(Icons.wifi_off_rounded, color: Colors.white, size: 48),
            const SizedBox(height: 16),
            Text(
              error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () {
                setState(() {
                  opening = true;
                  error = null;
                });
                join();
              },
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Réessayer'),
            ),
          ],
        ],
      ),
    ),
  );
}

String? _meetingDisplayName(Uri uri) {
  final value = uri.fragment
      .split('&')
      .map((entry) => entry.split('='))
      .where(
        (parts) => parts.length == 2 && parts.first == 'userInfo.displayName',
      )
      .map((parts) => Uri.decodeComponent(parts.last))
      .firstOrNull;
  if (value == null) return null;
  return value.replaceAll('"', '').trim();
}

class ContentCompletionBar extends StatefulWidget {
  const ContentCompletionBar({
    required this.onComplete,
    required this.initiallyCompleted,
    super.key,
  });

  final Future<bool> Function() onComplete;
  final bool initiallyCompleted;

  @override
  State<ContentCompletionBar> createState() => _ContentCompletionBarState();
}

class _ContentCompletionBarState extends State<ContentCompletionBar> {
  late bool completed = widget.initiallyCompleted;
  bool busy = false;

  Future<void> complete() async {
    if (busy || completed) return;
    setState(() => busy = true);
    final success = await widget.onComplete();
    if (mounted) {
      setState(() {
        completed = success;
        busy = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    top: false,
    child: Container(
      color: const Color(0xFF11131C),
      padding: const EdgeInsets.fromLTRB(18, 12, 18, 14),
      child: FilledButton.icon(
        onPressed: completed || busy ? null : complete,
        icon: busy
            ? const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : Icon(
                completed ? Icons.check_circle_rounded : Icons.task_alt_rounded,
              ),
        label: Text(
          completed
              ? 'Chapitre terminé'
              : busy
              ? 'Validation…'
              : 'Terminer ce chapitre',
        ),
      ),
    ),
  );
}

class MobileNetworkTarget {
  const MobileNetworkTarget(this.uri, this.headers);

  final Uri uri;
  final Map<String, String> headers;
}

MobileNetworkTarget mobileNetworkTarget(Uri uri, {bool? isAndroid}) {
  if ((isAndroid ?? Platform.isAndroid) &&
      (uri.host == 'localhost' || uri.host == '127.0.0.1')) {
    return MobileNetworkTarget(uri.replace(host: '10.0.2.2'), {
      'Host': uri.hasPort ? '${uri.host}:${uri.port}' : uri.host,
    });
  }
  return MobileNetworkTarget(uri, const {});
}

class NexaPdfViewer extends StatefulWidget {
  const NexaPdfViewer({
    this.localPath,
    this.uri,
    this.httpHeaders = const {},
    super.key,
  });

  final String? localPath;
  final Uri? uri;
  final Map<String, String> httpHeaders;

  @override
  State<NexaPdfViewer> createState() => _NexaPdfViewerState();
}

class _NexaPdfViewerState extends State<NexaPdfViewer> {
  late final Future<String> path = _prepare();

  Future<String> _prepare() async {
    if (widget.localPath != null) return widget.localPath!;
    final response = await http.get(widget.uri!, headers: widget.httpHeaders);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw const HttpException('Téléchargement PDF impossible');
    }
    final directory = await getTemporaryDirectory();
    final file = File(
      '${directory.path}${Platform.pathSeparator}khotwa-viewer-${widget.uri.hashCode}.pdf',
    );
    await file.writeAsBytes(response.bodyBytes, flush: true);
    return file.path;
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<String>(
    future: path,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return const Center(
          child: Text(
            'Impossible de charger ce document.',
            style: TextStyle(color: Colors.white),
          ),
        );
      }
      if (!snapshot.hasData) {
        return const Center(
          child: CircularProgressIndicator(color: NexaColors.aqua),
        );
      }
      return PDFView(
        filePath: snapshot.data!,
        enableSwipe: true,
        swipeHorizontal: true,
        autoSpacing: true,
        pageFling: true,
        backgroundColor: const Color(0xFF171923),
      );
    },
  );
}

Uri _embeddableUri(Uri uri) {
  final host = uri.host.toLowerCase();
  String? videoId;
  if (host == 'youtu.be' && uri.pathSegments.isNotEmpty) {
    videoId = uri.pathSegments.first;
  } else if (host.contains('youtube.com')) {
    if (uri.pathSegments.contains('embed')) return uri;
    videoId = uri.queryParameters['v'];
    if (videoId == null && uri.pathSegments.contains('shorts')) {
      final index = uri.pathSegments.indexOf('shorts');
      if (index + 1 < uri.pathSegments.length) {
        videoId = uri.pathSegments[index + 1];
      }
    }
  }
  if (videoId == null || videoId.isEmpty) return uri;
  return Uri.https('www.youtube.com', '/embed/$videoId', {
    'playsinline': '1',
    'rel': '0',
    'modestbranding': '1',
  });
}

class NexaWebContent extends StatefulWidget {
  const NexaWebContent({required this.uri, this.isMeeting = false, super.key});
  final Uri uri;
  final bool isMeeting;

  @override
  State<NexaWebContent> createState() => _NexaWebContentState();
}

class _NexaWebContentState extends State<NexaWebContent> {
  late final WebViewController controller;
  int progress = 0;
  String? error;
  bool dnsError = false;
  bool meetingLoaded = false;
  bool closingMeeting = false;

  void handleMeetingUrl(String rawUrl, {bool pageFinished = false}) {
    if (!widget.isMeeting || closingMeeting) return;
    final candidate = Uri.tryParse(rawUrl);
    if (candidate == null) return;
    final insideRoom = isSameMeetingRoom(widget.uri, candidate);
    if (pageFinished && insideRoom) meetingLoaded = true;
    if (!meetingLoaded || insideRoom) return;
    closingMeeting = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.maybePop(context);
    });
  }

  @override
  void initState() {
    super.initState();
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF090B12))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (value) => setState(() => progress = value),
          onPageFinished: (url) => handleMeetingUrl(url, pageFinished: true),
          onUrlChange: (change) {
            final url = change.url;
            if (url != null) handleMeetingUrl(url);
          },
          onPageStarted: (_) => setState(() {
            error = null;
            dnsError = false;
          }),
          onWebResourceError: (value) {
            if (value.isForMainFrame == true) {
              setState(() {
                error = value.description;
                dnsError = value.errorCode == -2;
              });
            }
          },
          onNavigationRequest: (request) {
            final target = Uri.tryParse(request.url);
            if (target == null || !{'http', 'https'}.contains(target.scheme)) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(widget.uri);
    final platform = controller.platform;
    if (platform is AndroidWebViewController) {
      platform
        ..setMediaPlaybackRequiresUserGesture(false)
        ..setOnPlatformPermissionRequest((request) => request.grant());
    }
  }

  @override
  Widget build(BuildContext context) => Stack(
    children: [
      WebViewWidget(controller: controller),
      if (progress < 100)
        LinearProgressIndicator(
          value: progress / 100,
          minHeight: 3,
          color: NexaColors.aqua,
          backgroundColor: Colors.transparent,
        ),
      if (error != null)
        Positioned.fill(
          child: ColoredBox(
            color: const Color(0xFF090B12),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.cloud_off_rounded,
                      color: Colors.white,
                      size: 48,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      widget.isMeeting && dnsError
                          ? 'Le DNS de l’émulateur ne trouve pas le serveur Jitsi. Redémarrez l’émulateur avec un DNS valide.'
                          : widget.isMeeting
                          ? 'Impossible de rejoindre la classe. Vérifiez votre connexion.'
                          : 'Impossible de charger ce contenu.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 16),
                    ),
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed: () => controller.reload(),
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Réessayer'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
    ],
  );
}

bool isSameMeetingRoom(Uri initial, Uri candidate) {
  if (candidate.host.toLowerCase() != initial.host.toLowerCase()) return false;
  final initialRoom = initial.pathSegments.where((part) => part.isNotEmpty);
  if (initialRoom.isEmpty) return candidate.path == initial.path;
  final room = initialRoom.first;
  return candidate.pathSegments.any(
    (part) => part.toLowerCase() == room.toLowerCase(),
  );
}

class NexaVideoPlayer extends StatefulWidget {
  const NexaVideoPlayer({
    required this.title,
    this.uri,
    this.localPath,
    this.httpHeaders = const {},
    super.key,
  });
  final String title;
  final Uri? uri;
  final String? localPath;
  final Map<String, String> httpHeaders;

  @override
  State<NexaVideoPlayer> createState() => _NexaVideoPlayerState();
}

class _NexaVideoPlayerState extends State<NexaVideoPlayer> {
  late final VideoPlayerController controller;
  late final Future<void> initialized;

  @override
  void initState() {
    super.initState();
    controller = widget.localPath != null
        ? VideoPlayerController.file(File(widget.localPath!))
        : VideoPlayerController.networkUrl(
            widget.uri!,
            httpHeaders: widget.httpHeaders,
          );
    initialized = controller.initialize().then((_) {
      controller.setLooping(false);
      if (mounted) setState(() {});
    });
    controller.addListener(_refresh);
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    controller.removeListener(_refresh);
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
    future: initialized,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        return const Center(
          child: Text(
            'Cette vidéo ne peut pas être lue.',
            style: TextStyle(color: Colors.white),
          ),
        );
      }
      if (snapshot.connectionState != ConnectionState.done) {
        return const Center(
          child: CircularProgressIndicator(color: NexaColors.aqua),
        );
      }
      final duration = controller.value.duration.inMilliseconds.toDouble();
      final position = controller.value.position.inMilliseconds
          .toDouble()
          .clamp(0.0, duration == 0 ? 1.0 : duration)
          .toDouble();
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AspectRatio(
              aspectRatio: controller.value.aspectRatio == 0
                  ? 16 / 9
                  : controller.value.aspectRatio,
              child: VideoPlayer(controller),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 18, 20),
              child: Row(
                children: [
                  IconButton.filled(
                    onPressed: () => controller.value.isPlaying
                        ? controller.pause()
                        : controller.play(),
                    icon: Icon(
                      controller.value.isPlaying
                          ? Icons.pause_rounded
                          : Icons.play_arrow_rounded,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Slider(
                      value: position,
                      max: duration == 0 ? 1.0 : duration,
                      onChanged: (value) => controller.seekTo(
                        Duration(milliseconds: value.round()),
                      ),
                    ),
                  ),
                  Text(
                    _time(controller.value.position),
                    style: const TextStyle(color: Colors.white70, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    },
  );
}

String _time(Duration value) {
  final minutes = value.inMinutes.remainder(60).toString().padLeft(2, '0');
  final seconds = value.inSeconds.remainder(60).toString().padLeft(2, '0');
  return '$minutes:$seconds';
}
