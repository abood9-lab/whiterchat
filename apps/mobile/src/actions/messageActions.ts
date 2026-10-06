import { ThunkAction, ThunkDispatch } from "redux-thunk";
import { MessageAction, messageActionTypes } from '../reducers/messageReducer';
import { fetchConversations, fetchMessages, sendMessage } from '../api/messages';
import { mobileSocket } from '../api/socket';

export const FetchConversationListRequest = ():
    ThunkAction<Promise<void>, {}, {}, MessageAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, MessageAction>) => {
        try {
            const conversations = await fetchConversations();
            dispatch({
                type: messageActionTypes.FETCH_CONVERSATION_LIST_SUCCESS,
                payload: conversations
            });
        } catch (e) {
            console.warn('FetchConversationList error:', e);
        }
    };
};

export const FetchMessageListRequest = (conversationId: string):
    ThunkAction<Promise<void>, {}, {}, MessageAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, MessageAction>) => {
        try {
            const messages = await fetchMessages(conversationId);
            dispatch({
                type: messageActionTypes.FETCH_MESSAGE_LIST_SUCCESS,
                payload: { conversationId, messages }
            });
        } catch (e) {
            console.warn('FetchMessageList error:', e);
        }
    };
};

export const SendMessageRequest = (conversationId: string, text: string):
    ThunkAction<Promise<void>, {}, {}, MessageAction> => {
    return async (dispatch: ThunkDispatch<{}, {}, MessageAction>) => {
        try {
            await sendMessage(conversationId, { text });
            const socket = mobileSocket.getSocket();
            if (socket) {
                socket.emit('send_message', { conversationId, text });
            }
            dispatch(FetchMessageListRequest(conversationId));
        } catch (e) {
            console.warn('SendMessage error:', e);
        }
    };
};
