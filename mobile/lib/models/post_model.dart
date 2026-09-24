import 'user_model.dart';

class PostModel {
  final String id;
  final UserModel author;
  final String? caption;
  final List<String> mediaUrls;
  final String mediaType;
  final int likesCount;
  final int commentsCount;
  final int sharesCount;
  final bool isLiked;
  final bool isSaved;
  final String? location;
  final DateTime createdAt;

  const PostModel({
    required this.id,
    required this.author,
    this.caption,
    this.mediaUrls = const [],
    this.mediaType = 'image',
    this.likesCount = 0,
    this.commentsCount = 0,
    this.sharesCount = 0,
    this.isLiked = false,
    this.isSaved = false,
    this.location,
    required this.createdAt,
  });

  factory PostModel.fromJson(Map<String, dynamic> json) {
    UserModel authorUser;
    if (json['authorId'] is Map<String, dynamic>) {
      authorUser = UserModel.fromJson(json['authorId']);
    } else if (json['author'] is Map<String, dynamic>) {
      authorUser = UserModel.fromJson(json['author']);
    } else {
      authorUser = UserModel(
        id: json['authorId']?.toString() ?? '',
        username: 'anonymous',
        displayName: 'Anonymous',
      );
    }

    final mediaList = <String>[];
    if (json['mediaUrls'] is List) {
      for (final m in json['mediaUrls']) {
        if (m != null) mediaList.add(m.toString());
      }
    }

    DateTime parsedDate;
    try {
      parsedDate = json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return PostModel(
      id: json['_id'] ?? json['id'] ?? '',
      author: authorUser,
      caption: json['caption'],
      mediaUrls: mediaList,
      mediaType: json['mediaType'] ?? 'image',
      likesCount: json['likesCount'] ?? 0,
      commentsCount: json['commentsCount'] ?? 0,
      sharesCount: json['sharesCount'] ?? 0,
      isLiked: json['isLiked'] ?? false,
      isSaved: json['isSaved'] ?? false,
      location: json['location'],
      createdAt: parsedDate,
    );
  }

  PostModel copyWith({
    String? id,
    UserModel? author,
    String? caption,
    List<String>? mediaUrls,
    String? mediaType,
    int? likesCount,
    int? commentsCount,
    int? sharesCount,
    bool? isLiked,
    bool? isSaved,
    String? location,
    DateTime? createdAt,
  }) {
    return PostModel(
      id: id ?? this.id,
      author: author ?? this.author,
      caption: caption ?? this.caption,
      mediaUrls: mediaUrls ?? this.mediaUrls,
      mediaType: mediaType ?? this.mediaType,
      likesCount: likesCount ?? this.likesCount,
      commentsCount: commentsCount ?? this.commentsCount,
      sharesCount: sharesCount ?? this.sharesCount,
      isLiked: isLiked ?? this.isLiked,
      isSaved: isSaved ?? this.isSaved,
      location: location ?? this.location,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
