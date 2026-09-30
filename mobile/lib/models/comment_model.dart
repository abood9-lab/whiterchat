import 'user_model.dart';

class CommentModel {
  final String id;
  final String postId;
  final UserModel author;
  final String content;
  final int likesCount;
  final bool isLiked;
  final DateTime createdAt;

  const CommentModel({
    required this.id,
    required this.postId,
    required this.author,
    required this.content,
    this.likesCount = 0,
    this.isLiked = false,
    required this.createdAt,
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    UserModel authorUser;
    if (json['author'] is Map<String, dynamic>) {
      authorUser = UserModel.fromJson(json['author']);
    } else {
      authorUser = const UserModel(
        id: '',
        username: 'anonymous',
        displayName: 'Anonymous',
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

    return CommentModel(
      id: json['_id'] ?? json['id'] ?? '',
      postId: json['postId'] ?? '',
      author: authorUser,
      content: json['content'] ?? '',
      likesCount: json['likesCount'] ?? 0,
      isLiked: json['isLiked'] ?? false,
      createdAt: parsedDate,
    );
  }
}
