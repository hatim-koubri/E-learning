import 'package:elearning_mobile/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('classe les formations à découvrir, en cours puis terminées', () {
    final courses = <Map<String, dynamic>>[
      {'id': 3, 'titre': 'Terminée', 'inscrit': true, 'progression': 100},
      {'id': 2, 'titre': 'En cours', 'inscrit': true, 'progression': 45},
      {'id': 1, 'titre': 'À découvrir', 'inscrit': false},
    ]..sort(compareCourseOrder);

    expect(courses.map((course) => course['id']), [1, 2, 3]);
  });
}
