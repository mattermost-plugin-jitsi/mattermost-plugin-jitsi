import {Client4} from 'mattermost-redux/client';
import {ClientError} from 'mattermost-redux/client/client4';

import {id} from '../manifest';

export default class Client {
    url: string;
    baseUrl: string = '';

    constructor() {
        this.url = '/plugins/' + id;
        if ((window as any).basename) {
            this.baseUrl = (window as any).basename;
        }
        this.url = this.baseUrl + '/plugins/' + id;
    }

    startMeeting = async (channelId: string, personal: boolean = false, topic: string = '', meetingId: string = '') => {
        return this.doPost(`${this.url}/api/v1/meetings`, {channel_id: channelId, personal, topic, meeting_id: meetingId});
    }

    enrichMeetingJwt = async (meetingJwt: string) => {
        return this.doPost(`${this.url}/api/v1/meetings/enrich`, {jwt: meetingJwt});
    }

    setUserStatus = async (userId: string | null, status: string) => {
        return this.doPut(`${this.baseUrl}/api/v4/users/${userId}/status`, {user_id: userId, status});
    }

    loadConfig = async () => {
        return this.doPost(`${this.url}/api/v1/config`, {});
    }

    doPost = async (url: string, body: any, headers: any = {}) => {
        const options = {
            method: 'post',
            body: JSON.stringify(body),
            headers
        };

        const response = await fetch(url, Client4.getOptions(options));

        if (response.ok) {
            return response.json();
        }

        const text = await response.text();

        throw new ClientError(Client4.url, {
            message: text || '',
            status_code: response.status,
            url
        });
    }

    doPut = async (url: string, body: any, headers: any = {}) => {
        const options = {
            method: 'put',
            body: JSON.stringify(body),
            headers
        };

        options.headers['X-Requested-With'] = 'XMLHttpRequest';

        const response = await fetch(url, Client4.getOptions(options));

        if (response.ok) {
            return response.json();
        }

        const text = await response.text();

        throw new ClientError(Client4.url, {
            message: text || '',
            status_code: response.status,
            url
        });
    }
}
