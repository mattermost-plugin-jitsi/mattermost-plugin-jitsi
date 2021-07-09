import * as React from 'react';
import JaaSSection from './jaas_section';
import {JitsiSection, JITSI_NAMING_SCHEME} from './jitsi_section';
import {id as pluginId} from '../../manifest';

type Props = {
    id: string,
    label: string,
    value: any,
    disabled: boolean,
    config: any,
    license: object,
    setByEnv: boolean,
    onChange: Function,
    registerSaveAction: Function,
    setSaveNeeded: Function,
    unRegisterSaveAction: Function
};

type Settings = {
    usejaas?: boolean,
    jitsiurl?: string,
    jitsiembedded?: boolean,
    jitsinamingscheme?: string,
    jitsijwt?: boolean,
    jitsiappid?: string,
    jitsiappsecret?: string,
    jitsilinkvalidtime?: number,
    jitsicompatibilitymode?: boolean,
    jaasappid?: string,
    jaasapikey?: string,
    jaasprivatekey?: string
};

type State = {
    value: Settings,
    mode: string
};

const JITSI_MODE = 'JITSI_MODE';
const JAAS_MODE = 'JAAS_MODE';

const DEFAULT_JITSI_URL = 'https://meet.jit.si';
const JITSI_LINK_VALID_TIME = 30; // TODO set default value
const DEFAULT_SETTINGS: Settings = {
    usejaas: false,
    jitsiurl: DEFAULT_JITSI_URL,
    jitsiembedded: false,
    jitsinamingscheme: JITSI_NAMING_SCHEME.WORDS,
    jitsijwt: false,
    jitsiappid: '',
    jitsiappsecret: '',
    jitsilinkvalidtime: JITSI_LINK_VALID_TIME,
    jitsicompatibilitymode: false,
    jaasappid: '',
    jaasapikey: '',
    jaasprivatekey: ''
};

export default class JitsiSettings extends React.Component<Props, State> {
    constructor(props: any) {
        super(props);

        let selectedMode = JITSI_MODE;

        // Check previous setting setup in case of upgrade

        if (this.props.value) {
            selectedMode = this.props.value.usejaas === true ? JAAS_MODE : JITSI_MODE;
        }

        let selectedSettings = DEFAULT_SETTINGS;

        if (!this.props.value) {
            selectedSettings = {
                jitsiurl: this.props.config.PluginSettings.Plugins[pluginId].jitsiurl || DEFAULT_SETTINGS.jitsiurl,
                jitsiappsecret: this.props.config.PluginSettings.Plugins[pluginId].jitsiappsecret || DEFAULT_SETTINGS.jitsiappsecret,
                jitsiappid: this.props.config.PluginSettings.Plugins[pluginId].jitsiappid || DEFAULT_SETTINGS.jaasappid,
                jitsicompatibilitymode: this.props.config.PluginSettings.Plugins[pluginId].jitsicompatibilitymode || DEFAULT_SETTINGS.jitsicompatibilitymode,
                jitsiembedded: this.props.config.PluginSettings.Plugins[pluginId].jitsiembedded || DEFAULT_SETTINGS.jitsiembedded,
                jitsijwt: this.props.config.PluginSettings.Plugins[pluginId].jitsijwt || DEFAULT_SETTINGS.jitsijwt,
                jitsilinkvalidtime: this.props.config.PluginSettings.Plugins[pluginId].jitsilinkvalidtime || DEFAULT_SETTINGS.jitsilinkvalidtime,
                jitsinamingscheme: this.props.config.PluginSettings.Plugins[pluginId].jitsinamingscheme || DEFAULT_SETTINGS.jitsinamingscheme,
                usejaas: DEFAULT_SETTINGS.usejaas,
                jaasappid: DEFAULT_SETTINGS.jaasappid,
                jaasapikey: DEFAULT_SETTINGS.jaasapikey,
                jaasprivatekey: DEFAULT_SETTINGS.jaasprivatekey
            };
        }

        this.state = {
            mode: selectedMode,
            value: this.props.value || selectedSettings
        };

        this.onJaaSApiKeyChanged = this.onJaaSApiKeyChanged.bind(this);
        this.onJaaSAppIDChanged = this.onJaaSAppIDChanged.bind(this);
        this.onJaaSPrivateKeyChanged = this.onJaaSPrivateKeyChanged.bind(this);
        this.onJaaSEmbeddedChanged = this.onJaaSEmbeddedChanged.bind(this);
        this.onJaaSCompatibilityChange = this.onJaaSCompatibilityChange.bind(this);

        this.onJitsiAppIDChanged = this.onJitsiAppIDChanged.bind(this);
        this.onJitsiAppSecretChanged = this.onJitsiAppSecretChanged.bind(this);
        this.onJitsiAuthChanged = this.onJitsiAuthChanged.bind(this);
        this.onJitsiCompatibilityChanged = this.onJitsiCompatibilityChanged.bind(this);
        this.onJitsiEmbeddedChanged = this.onJitsiEmbeddedChanged.bind(this);
        this.onJitsiMeetingLinkExpChanged = this.onJitsiMeetingLinkExpChanged.bind(this);
        this.onJitsiMeetingNamesChanged = this.onJitsiMeetingNamesChanged.bind(this);
        this.onJitsiURLChanged = this.onJitsiURLChanged.bind(this);
    }

    onModeSelected = (e: any) => {
        const newMode = e.target.value;
        this.setState((state) => {
            return {
                mode: newMode,
                value: {
                    ...state.value,
                    usejaas: newMode === JAAS_MODE
                }
            };
        }, () => {
            this.props.onChange(this.props.id, this.state.value);
            this.props.setSaveNeeded();
        });
    }

    componentDidUpdate() {}

    updateSettingsState(key: any, newValue: any) {
        this.setState((state) => {
            return {
                value: {
                    ...state.value,
                    [key]: newValue
                }
            };
        }, () => {
            this.props.onChange(this.props.id, this.state.value);
            this.props.setSaveNeeded();
        });
    }

    onJaaSApiKeyChanged(e: any) {
        this.updateSettingsState('jaasapikey', e.target.value);
    }

    onJaaSAppIDChanged(e: any) {
        this.updateSettingsState('jaasappid', e.target.value);
    }

    onJaaSPrivateKeyChanged(e: any) {
        this.updateSettingsState('jaasprivatekey', e.target.value);
    }

    // We reuse some of the Jitsi settings for JaaS
    onJaaSEmbeddedChanged(e: any) {
        const newValue = e.target.value === 'true';
        this.updateSettingsState('jitsiembedded', newValue);
    }

    onJaaSCompatibilityChange(e: any) {
        const newValue = e.target.value === 'true';
        this.updateSettingsState('jitsicompatibilitymode', newValue);
    }

    onJitsiAppIDChanged(e: any) {
        this.updateSettingsState('jitsiappid', e.target.value);
    }

    onJitsiAppSecretChanged(e: any) {
        this.updateSettingsState('jitsiappsecret', e.target.value);
    }

    onJitsiCompatibilityChanged(e: any) {
        const newValue = e.target.value === 'true';
        this.updateSettingsState('jitsicompatibilitymode', newValue);
    }

    onJitsiEmbeddedChanged(e: any) {
        this.updateSettingsState('jitsiembedded', e.target.value);
    }

    onJitsiAuthChanged(e: any) {
        this.updateSettingsState('jitsijwt', e.target.value === 'true');
    }

    onJitsiMeetingLinkExpChanged(e: any) {
        this.updateSettingsState('jitsilinkvalidtime', e.target.value);
    }

    onJitsiMeetingNamesChanged(e: any) {
        this.updateSettingsState('jitsinamingscheme', e.target.value);
    }

    onJitsiURLChanged(e: any) {
        this.updateSettingsState('jitsiurl', e.target.value);
    }

    renderJitsiSettings() {
        return (
            <JitsiSection
                disabled={this.props.disabled}
                onJitsiAppIDChange={this.onJitsiAppIDChanged}
                onJitsiAppSecretChange={this.onJitsiAppSecretChanged}
                onJitsiCompatibilityChange={this.onJitsiCompatibilityChanged}
                onJitsiEmbeddedChange={this.onJitsiEmbeddedChanged}
                onJitsiJwtAuthChange={this.onJitsiAuthChanged}
                onJitsiMeetingLinkExpChange={this.onJitsiMeetingLinkExpChanged}
                onJitsiMeetingNamesChange={this.onJitsiMeetingNamesChanged}
                onJitsiURLChange={this.onJitsiURLChanged}
                serverUrl={this.state.value.jitsiurl || ''}
                embedded={this.state.value.jitsiembedded || false}
                namingScheme={this.state.value.jitsinamingscheme || JITSI_NAMING_SCHEME.WORDS}
                jwtEnabled={this.state.value.jitsijwt || false}
                appID={this.state.value.jitsiappid || ''}
                appSecret={this.state.value.jitsiappsecret || ''}
                meetingLinkExpire={this.state.value.jitsilinkvalidtime || JITSI_LINK_VALID_TIME}
                compatibilityMode={this.state.value.jitsicompatibilitymode || false}
            />
        );
    }

    renderJaaSSettings() {
        return (
            <JaaSSection
                disabled={this.props.disabled}
                onApiKeyChange={this.onJaaSApiKeyChanged}
                onAppIDChange={this.onJaaSAppIDChanged}
                onPrivateKeyChange={this.onJaaSPrivateKeyChanged}
                onEmbeddedChange={this.onJaaSEmbeddedChanged}
                onCompatibilityChange={this.onJaaSCompatibilityChange}
                appID={this.state.value.jaasappid || ''}
                apiKey={this.state.value.jaasapikey || ''}
                privateKey={this.state.value.jaasprivatekey || ''}
                embedded={this.state.value.jitsiembedded || false}
                compatibilityMode={this.state.value.jitsicompatibilitymode || false}
            />
        );
    }

    render() {
        return (
            <div>
                <div className='form-group'>
                    <div className='col-sm-6'>
                        <label className='radio-inline'>
                            <input
                                type='radio'
                                checked={this.state.mode === JITSI_MODE}
                                onChange={this.onModeSelected}
                                value={JITSI_MODE}
                            />
                            <span>{'Enable Jitsi'}</span>
                        </label>
                    </div>
                    <div className='col-sm-6'>
                        <label className='radio-inline'>
                            <input
                                type='radio'
                                checked={this.state.mode === JAAS_MODE}
                                onChange={this.onModeSelected}
                                value={JAAS_MODE}
                            />
                            <span>{'Enable JaaS'}</span>
                        </label>
                    </div>
                </div>
                <hr style={{height: '3px'}}/>
                {
                    this.state.mode === JAAS_MODE ?
                        this.renderJaaSSettings() :
                        this.renderJitsiSettings()
                }
            </div>
        );
    }
}