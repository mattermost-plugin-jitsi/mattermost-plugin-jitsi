import {id} from '../../manifest';
import {JaaSActionTypes} from '../action_types';
import {ActionCreator, Dispatch, Action} from 'redux';
import {ThunkAction} from 'redux-thunk';
import {Client4} from 'mattermost-redux/client';

export interface StartMeetingWindowAction extends Action<JaaSActionTypes.START_MEETING_WINDOW> {
    data: {
        jaasJwt?: string
        jaasRoom?: string
    }
}

const baseUrl = '/plugins/' + id;

export type StartMeetingWindowThunk = ActionCreator<ThunkAction<Promise<StartMeetingWindowAction>, {}, null, StartMeetingWindowAction>>;

function startMeetingWindowAction(jwt: string | null, path: string | null) {
    return async (dispatch: Dispatch) => {
        try {
            const options = {
                method: 'post',
                body: JSON.stringify({jaasJwt: jwt || '', jaasPath: path}),
                headers: {}
            };
            return fetch(`${baseUrl}/api/v1/meetings/jaas/settings`, Client4.getOptions(options)).
                then((result) => {
                    if (result.ok) {
                        return result.json();
                    }
                    throw new Error(result.statusText);
                }).
                then((result) => {
                    const startMeetingAction: StartMeetingWindowAction = {
                        type: JaaSActionTypes.START_MEETING_WINDOW,
                        data: {
                            jaasJwt: result.jaasJwt,
                            jaasRoom: result.jaasRoom
                        }
                    };
                    return dispatch(startMeetingAction);
                });
        } catch (error) {
            return Promise.reject<StartMeetingWindowAction>(error);
        }
    };
}

export const startMeetingWindowActionCreator: StartMeetingWindowThunk = startMeetingWindowAction;