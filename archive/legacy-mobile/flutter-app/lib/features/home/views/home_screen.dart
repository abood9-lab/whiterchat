import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_colors.dart';
import '../../../providers/auth_provider.dart';
import '../../../providers/feed_provider.dart';
import '../widgets/post_card.dart';
import '../widgets/stories_rail.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedState = ref.watch(feedProvider);
    final authState = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                CupertinoIcons.chat_bubble_2_fill,
                color: Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 8),
            const Text(
              'WhiterChat',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.heart),
            onPressed: () {
              // Notifications
            },
          ),
          IconButton(
            icon: const Icon(CupertinoIcons.chat_bubble_2),
            onPressed: () {
              // Direct messages
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () => ref.read(feedProvider.notifier).loadFeed(refresh: true),
        child: CustomScrollView(
          slivers: [
            // Stories Rail
            SliverToBoxAdapter(
              child: StoriesRail(
                stories: feedState.stories,
                currentUser: authState.user,
              ),
            ),
            const SliverToBoxAdapter(
              child: Divider(height: 1),
            ),

            // Feed Loading State
            if (feedState.isLoading && feedState.posts.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: CircularProgressIndicator(color: AppColors.primary),
                ),
              )
            // Error State
            else if (feedState.errorMessage != null && feedState.posts.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.wifi_off_rounded, size: 48, color: AppColors.textMuted),
                        const SizedBox(height: 12),
                        Text(
                          feedState.errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () =>
                              ref.read(feedProvider.notifier).loadFeed(refresh: true),
                          child: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                ),
              )
            // Empty State
            else if (feedState.posts.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: Text(
                    'No posts yet. Follow people or create your first post!',
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                ),
              )
            // Feed List of Posts
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final post = feedState.posts[index];
                    return PostCard(post: post);
                  },
                  childCount: feedState.posts.length,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
