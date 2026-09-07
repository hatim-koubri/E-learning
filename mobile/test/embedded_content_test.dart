import 'package:elearning_mobile/src/embedded_content.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('route une URL MinIO locale vers la passerelle Android', () {
    final source = Uri.parse(
      'http://localhost:9000/bucket/video.mp4?X-Amz-Signature=signature',
    );

    final target = mobileNetworkTarget(source, isAndroid: true);

    expect(target.uri.host, '10.0.2.2');
    expect(target.uri.query, source.query);
    expect(target.headers['Host'], 'localhost:9000');
  });

  test('ne modifie pas les URLs publiques', () {
    final source = Uri.parse('https://cdn.example/video.mp4');

    final target = mobileNetworkTarget(source, isAndroid: true);

    expect(target.uri, source);
    expect(target.headers, isEmpty);
  });

  test('distingue la salle Jitsi de la page après raccrochage', () {
    final room = Uri.parse('https://meet.jit.si/nexalearn-room-42#config');

    expect(
      isSameMeetingRoom(
        room,
        Uri.parse('https://meet.jit.si/nexalearn-room-42?jwt=value'),
      ),
      isTrue,
    );
    expect(isSameMeetingRoom(room, Uri.parse('https://jaas.8x8.vc/')), isFalse);
    expect(isSameMeetingRoom(room, Uri.parse('https://meet.jit.si/')), isFalse);
  });
}
