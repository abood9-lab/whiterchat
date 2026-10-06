import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { CommentAction, commentActionTypes } from '../reducers/commentReducer';
import { fetchComments, addComment } from '../api/posts';

export const FetchCommentListRequest = (postId: string):
    ThunkAction<Promise<void>, {}, {}, CommentAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, CommentAction>) => {
        try {
            const comments = await fetchComments(postId);
            dispatch({
                type: commentActionTypes.FETCH_COMMENT_LIST_SUCCESS,
                payload: comments
            });
        } catch (e) {
            console.warn('FetchCommentList error:', e);
        }
    };
};

export const AddCommentRequest = (postId: string, text: string):
    ThunkAction<Promise<void>, {}, {}, CommentAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, CommentAction>) => {
        try {
            await addComment(postId, text);
            dispatch(FetchCommentListRequest(postId));
        } catch (e) {
            console.warn('AddComment error:', e);
        }
    };
};
