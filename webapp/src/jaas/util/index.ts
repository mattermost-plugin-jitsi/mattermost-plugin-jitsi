
export type JaaSMeetingState = {
    jaasJwt?: string | null,
    jaasRoom?: string | null
};

export type JaaSState = {
    openJaaSMeetingNewWindowJwt: string | null,
    openJaaSMeetingNewWindowPath: string | null,
    jaasMeetingState: JaaSMeetingState
};

export function loadInitialState() : JaaSState {
    const params = new URLSearchParams(window.location.search);
    const jwt = params.get('jwt');
    const path = window.location.pathname;

    return {
        openJaaSMeetingNewWindowJwt: jwt,
        openJaaSMeetingNewWindowPath: path,
        jaasMeetingState: {}
    };
}
