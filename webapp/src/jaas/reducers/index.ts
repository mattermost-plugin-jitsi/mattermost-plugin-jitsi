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

function openJaasMeetingWindow(state: any = null, action: AnyAction) {
    switch (action.type) {
    default:
        break;
    }
    return state;
}

const JaaSMeetingWindowReducer: Reducer<JaaSMeetingState> = JaaSMeetingWindow;
const openJaasMeetingWindowReducer : Reducer<string | null> = openJaasMeetingWindow;

export default combineReducers<JaaSState>({
    openJaaSMeetingNewWindowJwt: openJaasMeetingWindowReducer,
    openJaaSMeetingNewWindowPath: openJaasMeetingWindowReducer,
    jaasMeetingState: JaaSMeetingWindowReducer
});
