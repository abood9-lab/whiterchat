import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/views/login_screen.dart';
import 'features/navigation/views/main_navigation_screen.dart';
import 'providers/auth_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: WhiterChatApp(),
    ),
  );
}

class WhiterChatApp extends ConsumerWidget {
  const WhiterChatApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: 'WhiterChat',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark, // WhiterChat default dark theme
      home: _buildHomeWidget(authState),
    );
  }

  Widget _buildHomeWidget(AuthState authState) {
    if (authState.status == AuthStatus.loading && authState.user == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (authState.status == AuthStatus.authenticated && authState.user != null) {
      return const MainNavigationScreen();
    }

    return const LoginScreen();
  }
}
