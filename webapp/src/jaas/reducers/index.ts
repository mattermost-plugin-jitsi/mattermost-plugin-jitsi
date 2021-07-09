import {JaaSMeetingState, JaaSState} from 'jaas/util';
import {combineReducers, AnyAction, Reducer} from 'redux';
import {JaaSActionTypes} from '../action_types';
import {StartMeetingWindowAction} from '../actions';

type JaaSActions = StartMeetingWindowAction | AnyAction;

function JaaSMeetingWindow(state: JaaSMeetingState = {}, action: JaaSActions) {
    switch (action.type) {
    case JaaSActionTypes.START_MEETING_WINDOW: {
        return {
            ...state,
            jaasJwt: action.data.jaasJwt,
            jaasRoom: action.data.jaasRoom
        };
    }
    default:
        break;
    }
    return state;
}

export const JaaSMeetingWindowReducer: Reducer<JaaSMeetingState> = JaaSMeetingWindow;

export default combineReducers<JaaSState>({
    jaasMeetingState: JaaSMeetingWindowReducer
});
