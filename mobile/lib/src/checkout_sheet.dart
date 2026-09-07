import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'nexa_design.dart';
import 'participant_actions.dart';

class CheckoutSheet extends StatefulWidget {
  const CheckoutSheet({required this.offer, super.key});

  final ParticipantOffer offer;

  @override
  State<CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<CheckoutSheet> {
  final formKey = GlobalKey<FormState>();
  final holder = TextEditingController();
  final number = TextEditingController();
  final expiry = TextEditingController();
  final cvc = TextEditingController();

  @override
  void dispose() {
    holder.dispose();
    number.dispose();
    expiry.dispose();
    cvc.dispose();
    super.dispose();
  }

  String? requiredValue(String? value) =>
      value == null || value.trim().isEmpty ? 'Champ obligatoire' : null;

  void confirm() {
    if (formKey.currentState?.validate() != true) return;
    // Le backend du PFA simule actuellement l'achat. Aucune donnée de carte
    // n'est persistée ni envoyée tant qu'un prestataire PCI n'est pas branché.
    Navigator.pop(context, true);
  }

  @override
  Widget build(BuildContext context) => SafeArea(
    child: Padding(
      padding: EdgeInsets.fromLTRB(
        22,
        12,
        22,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 42,
                  height: 5,
                  decoration: BoxDecoration(
                    color: NexaColors.line,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),
              const SizedBox(height: 22),
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: NexaColors.primary.withValues(alpha: .1),
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: const Icon(
                      Icons.lock_rounded,
                      color: NexaColors.primary,
                    ),
                  ),
                  const SizedBox(width: 13),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Finaliser votre accès',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const Text(
                          'Paiement protégé • environnement de test',
                          style: TextStyle(
                            fontSize: 12,
                            color: NexaColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Container(
                padding: const EdgeInsets.all(17),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [NexaColors.primary, NexaColors.primaryDark],
                  ),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.offer.label,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Accès immédiat après confirmation',
                            style: TextStyle(
                              color: Color(0xFFDCD8FF),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${widget.offer.price} ${widget.offer.currency}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              Text(
                'Carte bancaire de test',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: holder,
                textCapitalization: TextCapitalization.words,
                validator: requiredValue,
                decoration: const InputDecoration(
                  labelText: 'Nom sur la carte',
                  prefixIcon: Icon(Icons.person_outline_rounded),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: number,
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  CardNumberInputFormatter(),
                ],
                validator: (value) =>
                    (value?.replaceAll(' ', '').length ?? 0) == 16
                    ? null
                    : 'Saisissez 16 chiffres de test',
                decoration: const InputDecoration(
                  labelText: 'Numéro de carte',
                  hintText: '4242 4242 4242 4242',
                  prefixIcon: Icon(Icons.credit_card_rounded),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: expiry,
                      keyboardType: TextInputType.number,
                      inputFormatters: [ExpiryDateInputFormatter()],
                      validator: (value) {
                        final match = RegExp(
                          r'^(0[1-9]|1[0-2])/\d{2}$',
                        ).hasMatch(value ?? '');
                        return match ? null : 'Format MM/AA';
                      },
                      decoration: const InputDecoration(
                        labelText: 'Expiration',
                        hintText: 'MM/AA',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: cvc,
                      obscureText: true,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(3),
                      ],
                      validator: (value) =>
                          (value?.length ?? 0) == 3 ? null : '3 chiffres',
                      decoration: const InputDecoration(
                        labelText: 'CVC',
                        hintText: '123',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Text(
                'Mode PFA : ces informations restent uniquement dans ce formulaire et ne sont jamais stockées.',
                style: TextStyle(fontSize: 11, color: NexaColors.muted),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: confirm,
                icon: const Icon(Icons.lock_rounded, size: 18),
                label: Text(
                  'Payer ${widget.offer.price} ${widget.offer.currency}',
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class CardNumberInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    final limited = digits.substring(0, digits.length.clamp(0, 16));
    final buffer = StringBuffer();
    for (var index = 0; index < limited.length; index++) {
      if (index > 0 && index % 4 == 0) buffer.write(' ');
      buffer.write(limited[index]);
    }
    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}

class ExpiryDateInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    var limited = digits.length > 4 ? digits.substring(0, 4) : digits;
    if (oldValue.text.endsWith('/') &&
        !newValue.text.endsWith('/') &&
        limited.length == 2) {
      limited = limited.substring(0, 1);
    }
    final formatted = limited.length >= 2
        ? '${limited.substring(0, 2)}/${limited.substring(2)}'
        : limited;
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
