import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { navigate } from "../navigations/rootNavigation";
import { defaultUserState, ErrorAction, SuccessAction, userAction, userActionTypes, userPayload } from '../reducers/userReducer';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '../api/auth';
import { fetchUserProfile, followUser, unfollowUser, searchUsers } from '../api/users';
import { mobileSocket } from '../api/socket';

export interface userLoginWithEmail {
    email: string;
    password?: string;
}

export type RegisterParams = { username: string; email: string; fullname?: string; password?: string };

export const LoginRequest = (user: userLoginWithEmail):
    ThunkAction<Promise<void>, {}, {}, userAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, userAction>) => {
        try {
            const res = await loginUser(user.email, user.password);
            if (res && res.user) {
                const u = res.user;
                const result: userPayload = {
                    user: {
                        logined: true,
                        userInfo: {
                            avatarURL: u.avatarUrl || '',
                            bio: u.bio || '',
                            birthday: '',
                            email: u.email || '',
                            followings: [],
                            fullname: u.fullName || u.username,
                            gender: 1,
                            phone: '',
                            searchRecent: [],
                            username: u.username,
                            website: '',
                            storyNotificationList: [],
                            postNotificationList: [],
                            requestedList: [],
                            unSuggestList: []
                        }
                    },
                    setting: {
                        notification: defaultUserState.setting?.notification,
                        privacy: defaultUserState.setting?.privacy
                    }
                };
                dispatch(LoginSuccess(result));
                mobileSocket.connect();
                setTimeout(() => {
                    navigate('HomeTab');
                }, 100);
            } else {
                dispatch(LoginFailure());
            }
        } catch (e: any) {
            dispatch(LoginFailure());
        }
    };
};

export const LoginFailure = (): ErrorAction => {
    return {
        type: userActionTypes.LOGIN_FAILURE,
        payload: {
            message: 'Login Failed!'
        }
    };
};

export const LoginSuccess = (payload: userPayload): SuccessAction<userPayload> => {
    return {
        type: userActionTypes.LOGIN_SUCCESS,
        payload: payload
    };
};

export const RegisterRequest = (params: RegisterParams):
    ThunkAction<Promise<void>, {}, {}, userAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, userAction>) => {
        try {
            const res = await registerUser({
                username: params.username,
                email: params.email,
                fullName: params.fullname,
                password: params.password,
            });
            if (res && res.user) {
                const u = res.user;
                const result: userPayload = {
                    user: {
                        logined: true,
                        userInfo: {
                            avatarURL: u.avatarUrl || '',
                            bio: u.bio || '',
                            birthday: '',
                            email: u.email || '',
                            followings: [],
                            fullname: u.fullName || u.username,
                            gender: 1,
                            phone: '',
                            searchRecent: [],
                            username: u.username,
                            website: '',
                            storyNotificationList: [],
                            postNotificationList: [],
                            requestedList: [],
                            unSuggestList: []
                        }
                    },
                    setting: {
                        notification: defaultUserState.setting?.notification,
                        privacy: defaultUserState.setting?.privacy
                    }
                };
                dispatch(LoginSuccess(result));
                mobileSocket.connect();
                setTimeout(() => {
                    navigate('HomeTab');
                }, 100);
            } else {
                dispatch(LoginFailure());
            }
        } catch (e: any) {
            dispatch(LoginFailure());
        }
    };
};

export const LogoutRequest = ():
    ThunkAction<Promise<void>, {}, {}, userAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, userAction>) => {
        await logoutUser();
        mobileSocket.disconnect();
        dispatch({
            type: userActionTypes.LOGOUT,
            payload: {}
        });
        navigate('AuthStack');
    };
};

export const CheckSessionRequest = ():
    ThunkAction<Promise<void>, {}, {}, userAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, userAction>) => {
        try {
            const u = await getCurrentUser();
            if (u) {
                const result: userPayload = {
                    user: {
                        logined: true,
                        userInfo: {
                            avatarURL: u.avatarUrl || '',
                            bio: u.bio || '',
                            birthday: '',
                            email: u.email || '',
                            followings: [],
                            fullname: u.fullName || u.username,
                            gender: 1,
                            phone: '',
                            searchRecent: [],
                            username: u.username,
                            website: '',
                            storyNotificationList: [],
                            postNotificationList: [],
                            requestedList: [],
                            unSuggestList: []
                        }
                    },
                    setting: {
                        notification: defaultUserState.setting?.notification,
                        privacy: defaultUserState.setting?.privacy
                    }
                };
                dispatch(LoginSuccess(result));
                mobileSocket.connect();
            } else {
                dispatch(LogoutRequest());
            }
        } catch {
            dispatch(LogoutRequest());
        }
    };
};
