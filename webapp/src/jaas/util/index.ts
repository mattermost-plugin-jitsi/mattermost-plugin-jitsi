
export type JaaSMeetingState = {
    jaasJwt?: string | null,
    jaasRoom?: string | null
};

export type JaaSState = {
    jaasMeetingState: JaaSMeetingState
};

export function loadInitialState() : JaaSState {
    return {
        jaasMeetingState: {}
    };
}
