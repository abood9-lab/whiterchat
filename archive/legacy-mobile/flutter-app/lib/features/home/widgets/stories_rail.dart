import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/story_model.dart';
import '../../../models/user_model.dart';

class StoriesRail extends StatelessWidget {
  final List<StoryModel> stories;
  final UserModel? currentUser;

  const StoriesRail({
    super.key,
    required this.stories,
    this.currentUser,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 104,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: stories.length + 1, // First item is "Your Story / Add"
        separatorBuilder: (_, __) => const SizedBox(width: 14),
        itemBuilder: (context, index) {
          if (index == 0) {
            // "Your Story" Item
            return Column(
              children: [
                Stack(
                  children: [
                    Container(
                      width: 62,
                      height: 62,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.darkBorderLight, width: 1.5),
                      ),
                      child: ClipOval(
                        child: currentUser?.avatarUrl != null && currentUser!.avatarUrl!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: currentUser!.avatarUrl!,
                                fit: BoxFit.cover,
                                errorWidget: (_, __, ___) => const Icon(CupertinoIcons.person),
                              )
                            : const Icon(CupertinoIcons.person, color: AppColors.textMuted),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Theme.of(context).scaffoldBackgroundColor,
                            width: 2,
                          ),
                        ),
                        child: const Icon(Icons.add, color: Colors.white, size: 14),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                const Text(
                  'Your story',
                  style: TextStyle(fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            );
          }

          final story = stories[index - 1];
          final author = story.author;

          return GestureDetector(
            onTap: () {
              // Open Story Viewer
            },
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  padding: const EdgeInsets.all(2.5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.primaryLight],
                      begin: Alignment.bottomLeft,
                      end: Alignment.topRight,
                    ),
                  ),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: Theme.of(context).scaffoldBackgroundColor,
                        width: 2,
                      ),
                    ),
                    child: ClipOval(
                      child: author.avatarUrl != null && author.avatarUrl!.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: author.avatarUrl!,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => const Icon(CupertinoIcons.person),
                            )
                          : const Icon(CupertinoIcons.person, color: AppColors.textMuted),
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                SizedBox(
                  width: 64,
                  child: Text(
                    author.username,
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
