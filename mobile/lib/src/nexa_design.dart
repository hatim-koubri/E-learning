import 'package:flutter/material.dart';

abstract final class NexaColors {
  static const ink = Color(0xFF101828);
  static const muted = Color(0xFF667085);
  static const primary = Color(0xFF5B4BDB);
  static const primaryDark = Color(0xFF3D2FB4);
  static const aqua = Color(0xFF19B8A8);
  static const coral = Color(0xFFFF7A59);
  static const canvas = Color(0xFFF7F8FC);
  static const line = Color(0xFFE8EAF2);
}

ThemeData nexaTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: NexaColors.primary,
    brightness: Brightness.light,
    surface: Colors.white,
  );
  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: NexaColors.canvas,
    fontFamily: 'sans-serif',
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 34,
        height: 1.08,
        fontWeight: FontWeight.w800,
        letterSpacing: -1.2,
        color: NexaColors.ink,
      ),
      headlineMedium: TextStyle(
        fontSize: 27,
        height: 1.15,
        fontWeight: FontWeight.w800,
        letterSpacing: -.7,
        color: NexaColors.ink,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        letterSpacing: -.3,
        color: NexaColors.ink,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w700,
        color: NexaColors.ink,
      ),
      bodyLarge: TextStyle(fontSize: 16, height: 1.5, color: NexaColors.ink),
      bodyMedium: TextStyle(
        fontSize: 14,
        height: 1.45,
        color: NexaColors.muted,
      ),
      labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: NexaColors.canvas,
      foregroundColor: NexaColors.ink,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w800,
        color: NexaColors.ink,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: const BorderSide(color: NexaColors.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 17),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NexaColors.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NexaColors.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: NexaColors.primary, width: 1.7),
      ),
      labelStyle: const TextStyle(color: NexaColors.muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: NexaColors.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size(48, 52),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 15),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        textStyle: const TextStyle(fontWeight: FontWeight.w800),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 72,
      elevation: 0,
      backgroundColor: Colors.white,
      indicatorColor: NexaColors.primary.withValues(alpha: .12),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 12,
          fontWeight: states.contains(WidgetState.selected)
              ? FontWeight.w800
              : FontWeight.w600,
          color: states.contains(WidgetState.selected)
              ? NexaColors.primary
              : NexaColors.muted,
        ),
      ),
    ),
  );
}

class NexaLogo extends StatelessWidget {
  const NexaLogo({this.light = false, super.key});
  final bool light;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Image.asset(
        'assets/brand/khotwa-mark.png',
        width: 42,
        height: 42,
        fit: BoxFit.contain,
        semanticLabel: 'Logo Khotwa',
      ),
      const SizedBox(width: 10),
      Text(
        'Khotwa',
        style: TextStyle(
          fontSize: 21,
          fontWeight: FontWeight.w900,
          letterSpacing: -.6,
          color: light ? Colors.white : NexaColors.ink,
        ),
      ),
    ],
  );
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {this.subtitle, this.action, super.key});
  final String title;
  final String? subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleLarge),
            if (subtitle != null) ...[
              const SizedBox(height: 3),
              Text(subtitle!, style: Theme.of(context).textTheme.bodyMedium),
            ],
          ],
        ),
      ),
      ?action,
    ],
  );
}

class StatusPill extends StatelessWidget {
  const StatusPill(
    this.label, {
    this.icon,
    this.color = NexaColors.primary,
    super.key,
  });
  final String label;
  final IconData? icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: color.withValues(alpha: .1),
      borderRadius: BorderRadius.circular(30),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
        ],
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
      ],
    ),
  );
}

class PremiumEmptyState extends StatelessWidget {
  const PremiumEmptyState({
    required this.icon,
    required this.title,
    required this.message,
    super.key,
  });
  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              color: NexaColors.primary.withValues(alpha: .1),
              borderRadius: BorderRadius.circular(24),
            ),
            child: Icon(icon, size: 34, color: NexaColors.primary),
          ),
          const SizedBox(height: 18),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 7),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}
