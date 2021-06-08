import * as React from 'react';
import {id as pluginId} from '../../../manifest';
import {AnyAction} from 'redux';
import {StartMeetingWindowAction, startMeetingWindowActionCreator} from '../../actions';
import {ThunkDispatch} from 'redux-thunk';

type Props = {
    actions: {
        startJaaSMeetingWindow: (jwt: string | null, path: string | null) => Promise<StartMeetingWindowAction>
    }
}

type State = {
    jaasJwt?: string | null,
    jaasRoom?: string | null,
}

export class JaaSConference extends React.PureComponent<Props, State> {
    api: any;

    constructor(props: Props) {
        super(props);
        this.state = {};
    }

    initJaaS(jwt: string, room: string) {
        const url = new URL(window.location.href);
        const noSSL = url.protocol === 'http:';

        const ws = Math.max(document.documentElement.clientWidth || 0, window?.innerWidth || 0);
        const hs = Math.max(document.documentElement.clientHeight || 0, window?.innerHeight || 0);
        const options = {
            width: ws,
            height: hs,
            roomName: room,
            jwt,
            noSSL,
            parentNode: document.querySelector('#jitsiMeet'),
            onload: () => {
                console.log('JitsiMeetExternalAPI loaded...');
            }
        };

        this.api = new (window as any).JitsiMeetExternalAPI('8x8.vc', options);
    }

    componentDidMount() {
        if (!(window as any).JitsiMeetExternalAPI) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.onload = () => {
                if (!this.state.jaasRoom) {
                    const params = new URLSearchParams(window.location.search);
                    const jwt = params.get('jwt');
                    const path = window.location.pathname;
                    this.props.actions.startJaaSMeetingWindow(jwt, path).
                        then((response) => {
                            this.setState({
                                jaasRoom: response.data.jaasRoom,
                                jaasJwt: response.data.jaasJwt
                            });
                        });
                }
            };
            script.src = `${(window as any).location.origin}/plugins/${pluginId}/jitsi_meet_external_api.js`;
            document.head.appendChild(script);
        }
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevState !== this.state) {
            this.initJaaS(this.state.jaasJwt as string, this.state.jaasRoom as string);
        }
    }

    render() {
        const style = getStyle();
        return (
            <div
                id='jitsiMeet'
                style={style.jitsiMeetContainer}
            />
        );
    }
}

function getStyle() : { [key: string]: React.CSSProperties} {
    return {
        jitsiMeetContainer: {
            width: '100%',
            height: '100%',
            display: 'flex'
        }
    };
}

export function MapDispatchToProps(dispatch: ThunkDispatch<any, any, AnyAction>) {
    return {
        actions: {
            startJaaSMeetingWindow: (param1: string | null, param2: string | null) => dispatch(startMeetingWindowActionCreator(param1, param2))
        }
    };
}