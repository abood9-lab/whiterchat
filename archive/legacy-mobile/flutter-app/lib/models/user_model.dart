class UserModel {
  final String id;
  final String username;
  final String displayName;
  final String? email;
  final String? avatarUrl;
  final String? bio;
  final String? website;
  final bool isVerified;
  final String role;
  final String plan;
  final int followersCount;
  final int followingCount;
  final int postsCount;
  final bool isFollowing;

  const UserModel({
    required this.id,
    required this.username,
    required this.displayName,
    this.email,
    this.avatarUrl,
    this.bio,
    this.website,
    this.isVerified = false,
    this.role = 'user',
    this.plan = 'free',
    this.followersCount = 0,
    this.followingCount = 0,
    this.postsCount = 0,
    this.isFollowing = false,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      username: json['username'] ?? '',
      displayName: json['displayName'] ?? json['username'] ?? '',
      email: json['email'],
      avatarUrl: json['avatarUrl'],
      bio: json['bio'],
      website: json['website'],
      isVerified: json['isVerified'] ?? false,
      role: json['role'] ?? 'user',
      plan: json['plan'] ?? 'free',
      followersCount: json['followersCount'] ?? 0,
      followingCount: json['followingCount'] ?? 0,
      postsCount: json['postsCount'] ?? 0,
      isFollowing: json['isFollowing'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'username': username,
      'displayName': displayName,
      'email': email,
      'avatarUrl': avatarUrl,
      'bio': bio,
      'website': website,
      'isVerified': isVerified,
      'role': role,
      'plan': plan,
      'followersCount': followersCount,
      'followingCount': followingCount,
      'postsCount': postsCount,
      'isFollowing': isFollowing,
    };
  }

  UserModel copyWith({
    String? id,
    String? username,
    String? displayName,
    String? email,
    String? avatarUrl,
    String? bio,
    String? website,
    bool? isVerified,
    String? role,
    String? plan,
    int? followersCount,
    int? followingCount,
    int? postsCount,
    bool? isFollowing,
  }) {
    return UserModel(
      id: id ?? this.id,
      username: username ?? this.username,
      displayName: displayName ?? this.displayName,
      email: email ?? this.email,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bio: bio ?? this.bio,
      website: website ?? this.website,
      isVerified: isVerified ?? this.isVerified,
      role: role ?? this.role,
      plan: plan ?? this.plan,
      followersCount: followersCount ?? this.followersCount,
      followingCount: followingCount ?? this.followingCount,
      postsCount: postsCount ?? this.postsCount,
      isFollowing: isFollowing ?? this.isFollowing,
    );
  }
}
