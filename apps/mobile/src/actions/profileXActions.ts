import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { fetchUserProfile, followUser, unfollowUser } from '../api/users';

export const FetchProfileXRequest = (username: string):
    ThunkAction<Promise<void>, {}, {}, any> => {
    return async (dispatch: ThunkDispatch<{}, {}, any>) => {
        try {
            const profile = await fetchUserProfile(username);
            dispatch({
                type: 'FETCH_PROFILEX_SUCCESS',
                payload: profile
            });
        } catch (e) {
            console.warn('FetchProfileX error:', e);
        }
    };
};

export const ToggleFollowProfileXRequest = (userId: string, username: string):
    ThunkAction<Promise<void>, {}, {}, any> => {
    return async (dispatch: ThunkDispatch<{}, {}, any>) => {
        try {
            await followUser(userId);
            dispatch(FetchProfileXRequest(username));
        } catch (e) {
            console.warn('ToggleFollowProfileX error:', e);
        }
    };
};
