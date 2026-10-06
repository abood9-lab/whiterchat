import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { ExtraPost, PostAction, postActionTypes, PostErrorAction, PostList, PostSuccessAction } from '../reducers/postReducer';
import { fetchFeed, likePost, createPost } from '../api/posts';

export const FetchPostListRequest = ():
    ThunkAction<Promise<void>, {}, {}, PostAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, PostAction>) => {
        try {
            const feedPosts = await fetchFeed(1, 20);
            const extraPostList: PostList = feedPosts.map((p) => {
                const mediaUrl = p.mediaUrl || (p.mediaUrls && p.mediaUrls[0]) || '';
                const extraPost: ExtraPost = {
                    id: p.id,
                    userId: p.author.username,
                    source: [mediaUrl],
                    caption: p.caption || '',
                    likes: Array(p.likesCount || 0).fill('user'),
                    commentCount: p.commentsCount || 0,
                    create_at: { seconds: Math.floor(new Date(p.createdAt || Date.now()).getTime() / 1000), nanoseconds: 0 },
                    ownUser: {
                        username: p.author.username,
                        fullname: p.author.fullName || p.author.username,
                        avatarURL: p.author.avatarUrl || '',
                    }
                } as any;
                return extraPost;
            });
            dispatch(FetchPostListSuccess(extraPostList));
        } catch (e) {
            console.warn('FetchPostList error:', e);
            dispatch(FetchPostListFailure());
        }
    };
};

export const FetchPostListFailure = (): PostErrorAction => {
    return {
        type: postActionTypes.FETCH_POST_LIST_FAILURE,
        payload: {
            message: 'Get Post List Failed!'
        }
    };
};

export const FetchPostListSuccess = (payload: PostList): PostSuccessAction<PostList> => {
    return {
        type: postActionTypes.FETCH_POST_LIST_SUCCESS,
        payload: payload
    };
};

export const LoadMorePostListRequest = ():
    ThunkAction<Promise<void>, {}, {}, PostAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, PostAction>) => {
        try {
            const feedPosts = await fetchFeed(2, 20);
            if (feedPosts.length > 0) {
                const extraPostList: PostList = feedPosts.map((p) => {
                    const mediaUrl = p.mediaUrl || (p.mediaUrls && p.mediaUrls[0]) || '';
                    return {
                        id: p.id,
                        userId: p.author.username,
                        source: [mediaUrl],
                        caption: p.caption || '',
                        likes: Array(p.likesCount || 0).fill('user'),
                        commentCount: p.commentsCount || 0,
                        create_at: { seconds: Math.floor(new Date(p.createdAt || Date.now()).getTime() / 1000), nanoseconds: 0 },
                        ownUser: {
                            username: p.author.username,
                            fullname: p.author.fullName || p.author.username,
                            avatarURL: p.author.avatarUrl || '',
                        }
                    } as any;
                });
                dispatch({
                    type: postActionTypes.LOAD_MORE_POST_LIST_SUCCESS,
                    payload: extraPostList
                });
            }
        } catch (e) {
            console.warn('LoadMorePostList error:', e);
        }
    };
};

export const ToggleLikePostRequest = (postId: string):
    ThunkAction<Promise<void>, {}, {}, PostAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, PostAction>) => {
        try {
            await likePost(postId);
            dispatch(FetchPostListRequest());
        } catch (e) {
            console.warn('ToggleLike error:', e);
        }
    };
};
