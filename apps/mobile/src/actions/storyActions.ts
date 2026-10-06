import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { fetchStoriesFeed } from '../api/stories';

export const FetchStoryListRequest = ():
    ThunkAction<Promise<void>, {}, {}, any> => {
    return async (dispatch: ThunkDispatch<{}, {}, any>) => {
        try {
            const stories = await fetchStoriesFeed();
            dispatch({
                type: 'FETCH_STORY_LIST_SUCCESS',
                payload: stories
            });
        } catch (e) {
            console.warn('FetchStoryList error:', e);
        }
    };
};
