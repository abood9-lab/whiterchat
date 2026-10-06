import 'user_model.dart';

class StoryModel {
  final String id;
  final UserModel author;
  final String mediaUrl;
  final String mediaType;
  final String? caption;
  final bool isViewed;
  final DateTime createdAt;

  const StoryModel({
    required this.id,
    required this.author,
    required this.mediaUrl,
    this.mediaType = 'image',
    this.caption,
    this.isViewed = false,
    required this.createdAt,
  });

  factory StoryModel.fromJson(Map<String, dynamic> json) {
    UserModel authorUser;
    if (json['authorId'] is Map<String, dynamic>) {
      authorUser = UserModel.fromJson(json['authorId']);
    } else if (json['author'] is Map<String, dynamic>) {
      authorUser = UserModel.fromJson(json['author']);
    } else {
      authorUser = const UserModel(
        id: '',
        username: 'user',
        displayName: 'User',
      );
    }

    DateTime parsedDate;
    try {
      parsedDate = json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now();
    } catch (_) {
      parsedDate = DateTime.now();
    }

    return StoryModel(
      id: json['_id'] ?? json['id'] ?? '',
      author: authorUser,
      mediaUrl: json['mediaUrl'] ?? '',
      mediaType: json['mediaType'] ?? 'image',
      caption: json['caption'],
      isViewed: json['isViewed'] ?? false,
      createdAt: parsedDate,
    );
  }
}
