import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_endpoints.dart';
import '../models/post_model.dart';
import '../models/user_model.dart';
import 'auth_provider.dart';

class ProfileState {
  final bool isLoading;
  final UserModel? profileUser;
  final List<PostModel> posts;
  final String? errorMessage;

  const ProfileState({
    this.isLoading = false,
    this.profileUser,
    this.posts = const [],
    this.errorMessage,
  });

  ProfileState copyWith({
    bool? isLoading,
    UserModel? profileUser,
    List<PostModel>? posts,
    String? errorMessage,
  }) {
    return ProfileState(
      isLoading: isLoading ?? this.isLoading,
      profileUser: profileUser ?? this.profileUser,
      posts: posts ?? this.posts,
      errorMessage: errorMessage,
    );
  }
}

class ProfileNotifier extends StateNotifier<ProfileState> {
  final Ref _ref;

  ProfileNotifier(this._ref) : super(const ProfileState());

  Future<void> loadUserProfile(String username) async {
    final client = _ref.read(apiClientProvider);
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final userRes = await client.get(ApiEndpoints.userProfile(username));
      if (userRes.data != null && userRes.data['user'] != null) {
        final user = UserModel.fromJson(userRes.data['user']);
        
        // Fetch user posts
        final postsRes = await client.get(ApiEndpoints.userPosts(user.id));
        final userPosts = <PostModel>[];
        if (postsRes.data != null && postsRes.data['posts'] is List) {
          for (final p in postsRes.data['posts']) {
            userPosts.add(PostModel.fromJson(p));
          }
        }

        state = state.copyWith(
          isLoading: false,
          profileUser: user,
          posts: userPosts,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load profile.',
      );
    }
  }
}

final profileProvider = StateNotifierProvider<ProfileNotifier, ProfileState>((ref) {
  return ProfileNotifier(ref);
});
