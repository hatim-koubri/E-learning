import 'package:elearning_mobile/src/checkout_sheet.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formate le numéro de carte par groupes de quatre chiffres', () {
    final result = CardNumberInputFormatter().formatEditUpdate(
      TextEditingValue.empty,
      const TextEditingValue(text: '4242424242424242'),
    );

    expect(result.text, '4242 4242 4242 4242');
  });

  test('ajoute automatiquement le séparateur de date expiration', () {
    final formatter = ExpiryDateInputFormatter();

    final month = formatter.formatEditUpdate(
      TextEditingValue.empty,
      const TextEditingValue(text: '12'),
    );
    final complete = formatter.formatEditUpdate(
      month,
      const TextEditingValue(text: '1228'),
    );

    expect(month.text, '12/');
    expect(complete.text, '12/28');
  });
}
