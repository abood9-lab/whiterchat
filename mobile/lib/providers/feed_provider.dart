import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_endpoints.dart';
import '../models/post_model.dart';
import '../models/story_model.dart';
import 'auth_provider.dart';

class FeedState {
  final bool isLoading;
  final bool isRefreshing;
  final List<PostModel> posts;
  final List<StoryModel> stories;
  final String? errorMessage;

  const FeedState({
    this.isLoading = false,
    this.isRefreshing = false,
    this.posts = const [],
    this.stories = const [],
    this.errorMessage,
  });

  FeedState copyWith({
    bool? isLoading,
    bool? isRefreshing,
    List<PostModel>? posts,
    List<StoryModel>? stories,
    String? errorMessage,
  }) {
    return FeedState(
      isLoading: isLoading ?? this.isLoading,
      isRefreshing: isRefreshing ?? this.isRefreshing,
      posts: posts ?? this.posts,
      stories: stories ?? this.stories,
      errorMessage: errorMessage,
    );
  }
}

class FeedNotifier extends StateNotifier<FeedState> {
  final Ref _ref;

  FeedNotifier(this._ref) : super(const FeedState()) {
    loadFeed();
  }

  Future<void> loadFeed({bool refresh = false}) async {
    final client = _ref.read(apiClientProvider);

    if (refresh) {
      state = state.copyWith(isRefreshing: true, errorMessage: null);
    } else {
      state = state.copyWith(isLoading: true, errorMessage: null);
    }

    try {
      final feedRes = await client.get(
        ApiEndpoints.feed,
        queryParameters: {'page': 1, 'limit': 20},
      );
      final storiesRes = await client.get(ApiEndpoints.storiesFeed);

      final loadedPosts = <PostModel>[];
      if (feedRes.data != null && feedRes.data['posts'] is List) {
        for (final p in feedRes.data['posts']) {
          loadedPosts.add(PostModel.fromJson(p));
        }
      }

      final loadedStories = <StoryModel>[];
      if (storiesRes.data != null && storiesRes.data['stories'] is List) {
        for (final s in storiesRes.data['stories']) {
          loadedStories.add(StoryModel.fromJson(s));
        }
      }

      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        posts: loadedPosts,
        stories: loadedStories,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        isRefreshing: false,
        errorMessage: 'Failed to load feed. Please check connection.',
      );
    }
  }

  Future<void> toggleLike(String postId) async {
    final client = _ref.read(apiClientProvider);
    final updatedPosts = state.posts.map((p) {
      if (p.id == postId) {
        final nextLiked = !p.isLiked;
        final nextCount = nextLiked ? p.likesCount + 1 : (p.likesCount > 0 ? p.likesCount - 1 : 0);
        return p.copyWith(isLiked: nextLiked, likesCount: nextCount);
      }
      return p;
    }).toList();

    state = state.copyWith(posts: updatedPosts);

    try {
      await client.post(ApiEndpoints.likePost(postId));
    } catch (_) {
      // Revert if error
    }
  }

  Future<void> toggleSave(String postId) async {
    final client = _ref.read(apiClientProvider);
    final updatedPosts = state.posts.map((p) {
      if (p.id == postId) {
        return p.copyWith(isSaved: !p.isSaved);
      }
      return p;
    }).toList();

    state = state.copyWith(posts: updatedPosts);

    try {
      await client.post(ApiEndpoints.savePost(postId));
    } catch (_) {
      // Revert if error
    }
  }
}

final feedProvider = StateNotifierProvider<FeedNotifier, FeedState>((ref) {
  return FeedNotifier(ref);
});
