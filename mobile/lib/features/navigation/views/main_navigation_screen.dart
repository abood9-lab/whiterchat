import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../home/views/home_screen.dart';
import '../../profile/views/profile_screen.dart';

class MainNavigationScreen extends ConsumerStatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  ConsumerState<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends ConsumerState<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const Center(child: Text('Explore (Phase 2)', style: TextStyle(color: AppColors.textMuted))),
    const Center(child: Text('Create Post (Phase 2)', style: TextStyle(color: AppColors.textMuted))),
    const Center(child: Text('Reels (Phase 2)', style: TextStyle(color: AppColors.textMuted))),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        indicatorColor: AppColors.primary.withOpacity(0.18),
        backgroundColor: Theme.of(context).bottomNavigationBarTheme.backgroundColor,
        elevation: 0,
        destinations: const [
          NavigationDestination(
            icon: Icon(CupertinoIcons.house),
            selectedIcon: Icon(CupertinoIcons.house_fill, color: AppColors.primary),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(CupertinoIcons.search),
            selectedIcon: Icon(CupertinoIcons.search, color: AppColors.primary),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(CupertinoIcons.plus_square),
            selectedIcon: Icon(CupertinoIcons.plus_square_fill, color: AppColors.primary),
            label: 'Create',
          ),
          NavigationDestination(
            icon: Icon(CupertinoIcons.play_rectangle),
            selectedIcon: Icon(CupertinoIcons.play_rectangle_fill, color: AppColors.primary),
            label: 'Reels',
          ),
          NavigationDestination(
            icon: Icon(CupertinoIcons.person),
            selectedIcon: Icon(CupertinoIcons.person_fill, color: AppColors.primary),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
