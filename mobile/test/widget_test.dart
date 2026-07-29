import 'package:flutter_test/flutter_test.dart';
import 'package:elearning_mobile/main.dart';
void main(){testWidgets('affiche la connexion',(tester)async{await tester.pumpWidget(const ElearningApp());expect(find.text('Bienvenue'),findsOneWidget);expect(find.text('Se connecter'),findsOneWidget);});}
