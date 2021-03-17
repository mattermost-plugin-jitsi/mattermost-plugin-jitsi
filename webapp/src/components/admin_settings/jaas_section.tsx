import * as React from 'react';

type Props = {
    disabled: boolean,
    onAppIDChange: any,
    onApiKeyChange: any,
    onPrivateKeyChange: any,
    onEmbeddedChange: any,
    apiKey: string,
    appID: string,
    privateKey: string
    embedded: boolean
};

export default class JaaSSection extends React.Component<Props> {
    constructor(props: any) {
        super(props);
        console.log('JaaSSection');
    }

    render() {
        // TODO replace with common components
        return (
            <div>
                <div className='form-group'>
                    <label className='col-sm-4'>
                        {'Embed JaaS video inside Mattermost:'}
                    </label>
                    <div className='col-sm-8'>
                        <label className='radio-inline'>
                            <input
                                type='radio'
                                value='true'
                                checked={this.props.embedded}
                                onChange={this.props.onEmbeddedChange}
                            />
                            <span>{'true'}</span>
                        </label>
                        <label className='radio-inline'>
                            <input
                                type='radio'
                                value='false'
                                checked={!this.props.embedded}
                                onChange={this.props.onEmbeddedChange}
                            />
                            <span>{'false'}</span>
                        </label>
                        <div className='help-text'>
                            <span>
                                {'(Experimental) When true, JaaS video is embedded as a floating window inside Mattermost by default.'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-4'>
                        {'AppID for JaaS Authentication:'}
                    </label>
                    <div className='col-sm-8'>
                        <input
                            className='form-control'
                            type='input'
                            maxLength={-1}
                            onChange={this.props.onAppIDChange}
                            value={this.props.appID}
                            disabled={this.props.disabled}
                        />
                        <div className='help-text'>
                            <span>
                                {'Specify your JaaS AppID. You can get the AppID from https://jaas.8x8.vc/#/apikeys .'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-4'>
                        {'Api key for JaaS Authentication:'}
                    </label>
                    <div className='col-sm-8'>
                        <input
                            className='form-control'
                            type='input'
                            maxLength={-1}
                            onChange={this.props.onApiKeyChange}
                            value={this.props.apiKey}
                            disabled={this.props.disabled}
                        />
                        <div className='help-text'>
                            <span>
                                {'Specify your JaaS Api Key. You can get the Api Key from https://jaas.8x8.vc/#/apikeys .'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className='form-group'>
                    <label className='col-sm-4'>
                        {'RSA Private key for JaaS Authentication:'}
                    </label>
                    <div className='col-sm-8'>
                        <textarea
                            className='form-control'
                            maxLength={-1}
                            rows={5}
                            onChange={this.props.onPrivateKeyChange}
                            value={this.props.privateKey}
                            disabled={this.props.disabled}
                        />
                        <div className='help-text'>
                            <span>
                                {'Specify your JaaS private key. You can get the private key from https://jaas.8x8.vc/#/start-guide in the 1. Api Key section .'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}