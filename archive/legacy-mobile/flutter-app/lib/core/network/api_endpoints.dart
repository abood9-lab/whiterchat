class ApiEndpoints {
  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String verifyOtp = '/auth/verify-otp';
  static const String resendOtp = '/auth/resend-otp';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String me = '/auth/me';

  // Feed & Posts
  static const String feed = '/posts/feed';
  static const String explore = '/posts/explore';
  static const String posts = '/posts';
  static String likePost(String id) => '/posts/$id/like';
  static String savePost(String id) => '/posts/$id/save';
  static String postComments(String id) => '/posts/$id/comments';

  // Stories
  static const String storiesFeed = '/stories/feed';
  static const String stories = '/stories';

  // Users & Profile
  static String userProfile(String username) => '/users/$username';
  static String userPosts(String userId) => '/users/$userId/posts';
  static String followUser(String userId) => '/users/$userId/follow';
  static const String updateProfile = '/users/profile';
}
