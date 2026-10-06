import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_colors.dart';
import '../../../models/post_model.dart';
import '../../../providers/feed_provider.dart';
import 'comments_sheet.dart';

class PostCard extends ConsumerStatefulWidget {
  final PostModel post;

  const PostCard({super.key, required this.post});

  @override
  ConsumerState<PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<PostCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _heartAnimController;
  late Animation<double> _heartScaleAnim;
  bool _showHeartAnim = false;

  @override
  void initState() {
    super.initState();
    _heartAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _heartScaleAnim = Tween<double>(begin: 0.0, end: 1.2).animate(
      CurvedAnimation(parent: _heartAnimController, curve: Curves.elasticOut),
    );
  }

  @override
  void dispose() {
    _heartAnimController.dispose();
    super.dispose();
  }

  void _triggerDoubleTapLike() {
    if (!widget.post.isLiked) {
      ref.read(feedProvider.notifier).toggleLike(widget.post.id);
    }
    setState(() => _showHeartAnim = true);
    _heartAnimController.forward().then((_) {
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) {
          _heartAnimController.reverse().then((_) {
            if (mounted) setState(() => _showHeartAnim = false);
          });
        }
      });
    });
  }

  void _openComments() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.75,
        child: CommentsSheet(postId: widget.post.id),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final author = widget.post.author;
    final hasMedia = widget.post.mediaUrls.isNotEmpty;
    final formattedDate = DateFormat.yMMMd().format(widget.post.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor.withOpacity(0.08),
            width: 1,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Author Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundImage: author.avatarUrl != null && author.avatarUrl!.isNotEmpty
                      ? CachedNetworkImageProvider(author.avatarUrl!)
                      : null,
                  child: author.avatarUrl == null || author.avatarUrl!.isEmpty
                      ? const Icon(CupertinoIcons.person, size: 18)
                      : null,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            author.username,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          if (author.isVerified) ...[
                            const SizedBox(width: 4),
                            const Icon(
                              Icons.verified,
                              color: AppColors.primary,
                              size: 14,
                            ),
                          ],
                        ],
                      ),
                      if (widget.post.location != null)
                        Text(
                          widget.post.location!,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.more_horiz),
                  onPressed: () {
                    // Actions sheet
                  },
                ),
              ],
            ),
          ),

          // Media Content with Double-Tap Like
          if (hasMedia)
            GestureDetector(
              onDoubleTap: _triggerDoubleTapLike,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  AspectRatio(
                    aspectRatio: 1.0,
                    child: CachedNetworkImage(
                      imageUrl: widget.post.mediaUrls.first,
                      fit: BoxFit.cover,
                      placeholder: (_, __) => Container(
                        color: AppColors.darkSurface,
                        child: const Center(child: CircularProgressIndicator()),
                      ),
                      errorWidget: (_, __, ___) => Container(
                        color: AppColors.darkSurface,
                        child: const Icon(Icons.broken_image, size: 40),
                      ),
                    ),
                  ),
                  if (_showHeartAnim)
                    ScaleTransition(
                      scale: _heartScaleAnim,
                      child: const Icon(
                        CupertinoIcons.heart_fill,
                        color: Colors.white,
                        size: 90,
                      ),
                    ),
                ],
              ),
            ),

          // Actions Bar (Like, Comment, Share, Save)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                IconButton(
                  icon: Icon(
                    widget.post.isLiked
                        ? CupertinoIcons.heart_fill
                        : CupertinoIcons.heart,
                    color: widget.post.isLiked ? AppColors.error : null,
                  ),
                  onPressed: () {
                    ref.read(feedProvider.notifier).toggleLike(widget.post.id);
                  },
                ),
                IconButton(
                  icon: const Icon(CupertinoIcons.chat_bubble),
                  onPressed: _openComments,
                ),
                IconButton(
                  icon: const Icon(CupertinoIcons.paperplane),
                  onPressed: () {
                    // Share post
                  },
                ),
                const Spacer(),
                IconButton(
                  icon: Icon(
                    widget.post.isSaved
                        ? CupertinoIcons.bookmark_fill
                        : CupertinoIcons.bookmark,
                    color: widget.post.isSaved ? AppColors.primary : null,
                  ),
                  onPressed: () {
                    ref.read(feedProvider.notifier).toggleSave(widget.post.id);
                  },
                ),
              ],
            ),
          ),

          // Likes Counter
          if (widget.post.likesCount > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                '${widget.post.likesCount} ${widget.post.likesCount == 1 ? 'like' : 'likes'}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),

          // Caption
          if (widget.post.caption != null && widget.post.caption!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: RichText(
                text: TextSpan(
                  style: DefaultTextStyle.of(context).style,
                  children: [
                    TextSpan(
                      text: '${author.username} ',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    TextSpan(text: widget.post.caption!),
                  ],
                ),
              ),
            ),

          // Comments shortcut
          if (widget.post.commentsCount > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: GestureDetector(
                onTap: _openComments,
                child: Text(
                  'View all ${widget.post.commentsCount} comments',
                  style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
                ),
              ),
            ),

          // Timestamp
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text(
              formattedDate,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
