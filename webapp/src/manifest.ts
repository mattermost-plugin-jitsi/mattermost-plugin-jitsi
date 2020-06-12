// This file is automatically generated. Do not modify it manually.

const manifest = JSON.parse(`
{
    "id": "jitsi",
    "name": "Jitsi",
    "description": "Jitsi audio and video conferencing plugin for Mattermost.",
    "homepage_url": "https://github.com/mattermost/mattermost-plugin-jitsi",
    "support_url": "https://github.com/mattermost/mattermost-plugin-jitsi/issues",
    "release_notes_url": "https://github.com/mattermost/mattermost-plugin-jitsi/releases/tag/v1.3.0",
    "icon_path": "assets/icon.svg",
    "version": "1.3.0",
    "min_server_version": "5.2.0",
    "server": {
        "executables": {
            "linux-amd64": "server/dist/plugin-linux-amd64",
            "darwin-amd64": "server/dist/plugin-darwin-amd64",
            "windows-amd64": "server/dist/plugin-windows-amd64.exe"
        },
        "executable": ""
    },
    "webapp": {
        "bundle_path": "webapp/dist/main.js"
    },
    "settings_schema": {
        "header": "",
        "footer": "",
        "settings": [
            {
                "key": "JitsiURL",
                "display_name": "Jitsi Server URL",
                "type": "text",
                "help_text": "The URL for your Jitsi server. For example, https://jitsi.example.com.",
                "placeholder": "https://jitsi.example.com",
                "default": null
            },
            {
                "key": "JitsiEmbedded",
                "display_name": "Embed Jitsi video inside Mattermost",
                "type": "bool",
                "help_text": "(Experimental) When true, Jitsi video is embedded as a floating window inside Mattermost.",
                "placeholder": "",
                "default": null
            },
            {
                "key": "JitsiNamingScheme",
                "display_name": "Jitsi Meeting Names",
                "type": "radio",
                "help_text": "Select how meeting names are generated.",
                "placeholder": "",
                "default": "words",
                "options": [
                    {
                        "display_name": "Random English words in title case (e.g. PlayfulDragonsObserveCuriously)",
                        "value": "words"
                    },
                    {
                        "display_name": "UUID (universally unique identifier)",
                        "value": "uuid"
                    },
                    {
                        "display_name": "Mattermost context specific names. Combination of team name, channel name and random text in public and private channels; personal meeting name in direct and group messages channels.",
                        "value": "mattermost"
                    },
                    {
                        "display_name": "Allow user to select meeting name",
                        "value": "ask"
                    }
                ]
            },
            {
                "key": "JitsiCompatibilityMode",
                "display_name": "Enable compatibility mode",
                "type": "bool",
                "help_text": "(Insecure) This improve the compatibility with your jitsi instance using jitsi javascript code through a proxy build in the plugin. **WARNING:** This can compromise the security of your mattermost instance if the security of your Jitsi instance get compromised.",
                "placeholder": "",
                "default": false
            },
            {
                "key": "JitsiJWT",
                "display_name": "Use JWT Authentication for Jitsi",
                "type": "bool",
                "help_text": "(Optional) If your Jitsi server uses JSON Web Tokens (JWT) for authentication, set this value to true.",
                "placeholder": "",
                "default": null
            },
            {
                "key": "JitsiAppID",
                "display_name": "App ID for JWT Authentication",
                "type": "text",
                "help_text": "(Optional) The App ID used for authentication by the Jitsi server and JWT token generator.",
                "placeholder": "",
                "default": null
            },
            {
                "key": "JitsiAppSecret",
                "display_name": "App Secret for JWT Authentication",
                "type": "text",
                "help_text": "(Optional) The App Secret used for authentication by the Jitsi server and JWT token generator.",
                "placeholder": "",
                "default": null
            },
            {
                "key": "JitsiLinkValidTime",
                "display_name": "Meeting Link Expiry Time (minutes)",
                "type": "number",
                "help_text": "(Optional) The number of minutes from when the meeting link is created to when it becomes invalid. Minimum is 1 minute. Only applies if using JWT authentication for your Jitsi server.",
                "placeholder": "",
                "default": 30
            }
        ]
    }
}
`);

export default manifest;
export const id: string = manifest.id;
export const version: string = manifest.version;
