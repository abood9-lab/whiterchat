import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { fetchNotifications } from '../api/notifications';

export const FetchNotificationListRequest = ():
    ThunkAction<Promise<void>, {}, {}, any> => {
    return async (dispatch: ThunkDispatch<{}, {}, any>) => {
        try {
            const notifs = await fetchNotifications();
            dispatch({
                type: 'FETCH_NOTIFICATION_LIST_SUCCESS',
                payload: notifs
            });
        } catch (e) {
            console.warn('FetchNotificationList error:', e);
        }
    };
};
