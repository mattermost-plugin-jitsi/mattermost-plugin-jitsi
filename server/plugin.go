package main

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/cristalhq/jwt/v3"
	"github.com/google/uuid"
	"github.com/mattermost/mattermost-plugin-api/i18n"
	"github.com/mattermost/mattermost-server/v5/mlog"
	"github.com/mattermost/mattermost-server/v5/model"
	"github.com/mattermost/mattermost-server/v5/plugin"
	"github.com/pkg/errors"
)

const jitsiNameSchemeAsk = "ask"
const jitsiNameSchemeWords = "words"
const jitsiNameSchemeUUID = "uuid"
const jitsiNameSchemeMattermost = "mattermost"
const configChangeEvent = "config_update"

const jaasAudienceClaim = "jitsi"
const jaasIssuerClaim = "chat"

type UserConfig struct {
	Embedded     bool   `json:"embedded"`
	NamingScheme string `json:"naming_scheme"`
}

type Plugin struct {
	plugin.MattermostPlugin

	// configurationLock synchronizes access to the configuration.
	configurationLock sync.RWMutex

	// configuration is the active plugin configuration. Consult getConfiguration and
	// setConfiguration for usage.
	configuration *configuration

	b *i18n.Bundle

	botID string

	jaasURLCheckRegExp *regexp.Regexp
}

func (p *Plugin) OnActivate() error {
	var onceRegEx sync.Once
	initRegExp := func() {
		p.jaasURLCheckRegExp = regexp.MustCompile(`(vpaas-magic-cookie-[a-f0-9]{32}\/.+)`)
	}
	onceRegEx.Do(initRegExp)

	config := p.getConfiguration()
	if err := config.IsValid(); err != nil {
		return err
	}

	command, err := p.createJitsiCommand()
	if err != nil {
		return err
	}

	if err = p.API.RegisterCommand(command); err != nil {
		return err
	}

	i18nBundle, err := i18n.InitBundle(p.API, filepath.Join("assets", "i18n"))
	if err != nil {
		return err
	}
	p.b = i18nBundle

	jitsiBot := &model.Bot{
		Username:    "jitsi",
		DisplayName: "Jitsi",
		Description: "A bot account created by the jitsi plugin",
	}
	options := []plugin.EnsureBotOption{
		plugin.ProfileImagePath("assets/icon.png"),
	}

	botID, ensureBotError := p.Helpers.EnsureBot(jitsiBot, options...)
	if ensureBotError != nil {
		return errors.Wrap(ensureBotError, "failed to ensure jitsi bot user.")
	}

	p.botID = botID

	return nil
}

type User struct {
	Avatar string `json:"avatar"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	ID     string `json:"id"`
}

type Context struct {
	User  User   `json:"user"`
	Group string `json:"group"`
}

type EnrichMeetingJwtRequest struct {
	Jwt string `json:"jwt"`
}

// Claims extents cristalhq/jwt standard claims to add jitsi-web-token specific fields
type Claims struct {
	jwt.StandardClaims
	Context Context `json:"context"`
	Room    string  `json:"room,omitempty"`
}

// JaaSUser ...
type JaaSUser struct {
	Avatar      string `json:"avatar"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	ID          string `json:"id,omitempty"`
	IsModerator string `json:"moderator,omitempty"`
}

// JaaSFeatures ...
type JaaSFeatures struct {
	LiveStreaming string `json:"livestreaming"`
	Recording     string `json:"recording"`
	OutboundCall  string `json:"outbound-call"`
	Transcription string `json:"transcription"`
}

// JaaSContext ...
type JaaSContext struct {
	User     JaaSUser     `json:"user"`
	Features JaaSFeatures `json:"features"`
}

// JaaSClaims ...
type JaaSClaims struct {
	Audience string      `json:"aud,omitempty"`
	Subject  string      `json:"sub,omitempty"`
	Issuer   string      `json:"iss,omitempty"`
	Room     string      `json:"room,omitempty"`
	Exp      int64       `json:"exp,omitempty"`
	Nbf      int64       `json:"nbf,omitempty"`
	Context  JaaSContext `json:"context"`
}

// JaaSSettings ...
type JaaSSettings struct {
	Jwt  string `json:"jaasJwt"`
	Room string `json:"jaasRoom"`
}

func verifyJwtJaaS(jaasToken string) (*JaaSClaims, error) {
	newToken, err := jwt.ParseString(jaasToken)
	if err != nil {
		mlog.Error("Error parsing jaas jwt", mlog.Err(err))
		return nil, err
	}

	var claims JaaSClaims
	if err = json.Unmarshal(newToken.RawClaims(), &claims); err != nil {
		mlog.Error("Error unmarshalling claims for jaas jwt", mlog.Err(err))
		return nil, err
	}

	return &claims, nil
}

func verifyJwt(secret string, jwtToken string) (*Claims, error) {
	verifier, err := jwt.NewVerifierHS(jwt.HS256, []byte(secret))
	if err != nil {
		mlog.Error("Error generating new HS256 signer", mlog.Err(err))
		return nil, err
	}

	newToken, err := jwt.ParseAndVerifyString(jwtToken, verifier)
	if err != nil {
		mlog.Error("Error parsing or verifiying jwt", mlog.Err(err))
		return nil, err
	}

	var claims Claims
	if err = json.Unmarshal(newToken.RawClaims(), &claims); err != nil {
		mlog.Error("Error unmarshalling claims from jwt", mlog.Err(err))
		return nil, err
	}
	return &claims, nil
}

func signClaims(secret string, claims *Claims) (string, error) {
	signer, err := jwt.NewSignerHS(jwt.HS256, []byte(secret))
	if err != nil {
		mlog.Error("Error generating new HS256 signer", mlog.Err(err))
		return "", errors.New("internal error")
	}
	builder := jwt.NewBuilder(signer)
	token, err := builder.Build(claims)
	if err != nil {
		return "", err
	}
	return string(token.Raw()), nil
}

func signClaimsJaaS(apiKeyJaaS string, privateKeyJaaS string, claimsJaaS *JaaSClaims) (string, error) {
	var err error
	privateKeyJaaSBytes := []byte(privateKeyJaaS)
	privPem, _ := pem.Decode(privateKeyJaaSBytes)

	if privPem == nil {
		mlog.Error("Error decoding specified JaaS private key")
		return "", errors.New("internal server error")
	}

	var privPemBytes []byte = privPem.Bytes
	var parsedKey interface{}
	parsedKey, err = x509.ParsePKCS8PrivateKey(privPemBytes)

	if err != nil {
		mlog.Error("Error parsing JaaS private key", mlog.Err(err))
		return "", err
	}
	success := false
	var privateKey *rsa.PrivateKey
	privateKey, success = parsedKey.(*rsa.PrivateKey)

	if !success {
		mlog.Error("Error converting JaaS private Key", mlog.Err(err))
		return "", err
	}

	signer, err := jwt.NewSignerRS(jwt.RS256, privateKey)

	if err != nil {
		return "", err
	}

	builder := jwt.NewBuilder(signer, jwt.WithKeyID(apiKeyJaaS))
	token, err := builder.Build(claimsJaaS)

	if err != nil {
		return "", err
	}

	return string(token.Raw()), nil
}

func (p *Plugin) deleteEphemeralPost(userID, postID string) {
	p.API.DeleteEphemeralPost(userID, postID)
}

func (p *Plugin) updateJwtUserInfo(jwtToken string, user *model.User) (string, error) {
	sanitizedUser := user.DeepCopy()

	if p.getConfiguration().UseJaaS {
		claims, err := verifyJwtJaaS(jwtToken)
		if err != nil {
			return "", err
		}

		config := p.API.GetConfig()
		if config.PrivacySettings.ShowFullName == nil || !*config.PrivacySettings.ShowFullName {
			sanitizedUser.FirstName = ""
			sanitizedUser.LastName = ""
		}
		if config.PrivacySettings.ShowEmailAddress == nil || !*config.PrivacySettings.ShowEmailAddress {
			sanitizedUser.Email = ""
		}

		newContext := JaaSContext{
			User: JaaSUser{
				Avatar:      fmt.Sprintf("%s/api/v4/users/%s/image?_=%d", *config.ServiceSettings.SiteURL, sanitizedUser.Id, sanitizedUser.LastPictureUpdate),
				Name:        sanitizedUser.GetDisplayName(model.SHOW_NICKNAME_FULLNAME),
				Email:       sanitizedUser.Email,
				ID:          sanitizedUser.Id,
				IsModerator: `true`,
			},
			Features: claims.Context.Features,
		}

		claims.Context = newContext

		return signClaimsJaaS(p.getConfiguration().JaaSApiKey, p.getConfiguration().JaaSPrivateKey, claims)
	}

	secret := p.getConfiguration().JitsiAppSecret

	claims, err := verifyJwt(secret, jwtToken)
	if err != nil {
		return "", err
	}

	config := p.API.GetConfig()
	if config.PrivacySettings.ShowFullName == nil || !*config.PrivacySettings.ShowFullName {
		sanitizedUser.FirstName = ""
		sanitizedUser.LastName = ""
	}
	if config.PrivacySettings.ShowEmailAddress == nil || !*config.PrivacySettings.ShowEmailAddress {
		sanitizedUser.Email = ""
	}
	newContext := Context{
		User: User{
			Avatar: fmt.Sprintf("%s/api/v4/users/%s/image?_=%d", *config.ServiceSettings.SiteURL, sanitizedUser.Id, sanitizedUser.LastPictureUpdate),
			Name:   sanitizedUser.GetDisplayName(model.SHOW_NICKNAME_FULLNAME),
			Email:  sanitizedUser.Email,
			ID:     sanitizedUser.Id,
		},
		Group: claims.Context.Group,
	}

	claims.Context = newContext

	return signClaims(secret, claims)
}

func (p *Plugin) generateJaaSJwtForUser(user *model.User) (string, error) {
	// User did not specify a jwt, generate a new jwt for user
	const ExpTimeDelaySec = 7200
	const _true = "true"

	claims := JaaSClaims{}
	claims.Issuer = jaasIssuerClaim
	claims.Audience = jaasAudienceClaim
	claims.Subject = p.getConfiguration().JaaSAppID
	claims.Room = "*"
	claims.Exp = time.Now().Unix() + ExpTimeDelaySec
	claims.Nbf = time.Now().Unix()
	claims.Context.Features.LiveStreaming = _true
	claims.Context.Features.Recording = _true
	claims.Context.Features.OutboundCall = _true
	claims.Context.Features.Transcription = _true
	claims.Context.User.Avatar = ""
	claims.Context.User.Email = user.Email
	claims.Context.User.ID = user.Id
	claims.Context.User.IsModerator = _true
	claims.Context.User.Name = user.GetFullName()

	var err2 error
	var jwtToken string
	jwtToken, err2 = signClaimsJaaS(p.getConfiguration().JaaSApiKey, p.getConfiguration().JaaSPrivateKey, &claims)

	// Maybe let the user join as guest...?
	return jwtToken, err2
}

func (p *Plugin) generateJaaSJwtForGuest(userid string) (string, error) {
	const ExpTimeDelaySec = 7200
	const _false = "false"

	guestClaims := JaaSClaims{}
	guestClaims.Issuer = jaasIssuerClaim
	guestClaims.Audience = jaasAudienceClaim
	guestClaims.Subject = p.getConfiguration().JaaSAppID
	guestClaims.Room = "*"
	guestClaims.Exp = time.Now().Unix() + ExpTimeDelaySec
	guestClaims.Nbf = time.Now().Unix()
	guestClaims.Context.Features.LiveStreaming = _false
	guestClaims.Context.Features.Recording = _false
	guestClaims.Context.Features.OutboundCall = _false
	guestClaims.Context.Features.Transcription = _false
	guestClaims.Context.User.Avatar = ""
	guestClaims.Context.User.Email = ""
	guestClaims.Context.User.ID = userid
	guestClaims.Context.User.IsModerator = _false
	guestClaims.Context.User.Name = ""

	jwtToken, err := signClaimsJaaS(p.getConfiguration().JaaSApiKey, p.getConfiguration().JaaSPrivateKey, &guestClaims)
	if err != nil {
		mlog.Error("Error generating JaaS token for guest", mlog.Err(err))
		return "", errors.New("failed creating new JaaS token for guest")
	}

	return jwtToken, err
}

func (p *Plugin) getJaaSSettings(jwtToken string, path string, user *model.User) (*JaaSSettings, error) {
	if user != nil {
		claims, err := verifyJwtJaaS(jwtToken)
		if err != nil {
			jwtToken, err = p.generateJaaSJwtForUser(user)
			if err != nil {
				mlog.Error("failed to generate new token for user!")
				return nil, err
			}

			// jwtToken = jwtGen
		} else if claims.Context.User.ID != user.Id {
			return nil, errors.New("not authorized")
		}
	} else {
		var err error
		jwtToken, err = p.generateJaaSJwtForGuest(uuid.New().String() + "-guest")

		if err != nil {
			mlog.Error("Error generating JaaS token for guest", mlog.Err(err))
			return nil, errors.New("failed creating new JaaS token for guest")
		}
	}

	// Get room
	roomPath := strings.ReplaceAll(path, "/plugins/jitsi/api/v1/meetings/", "")

	var settings JaaSSettings
	settings.Jwt = jwtToken
	settings.Room = roomPath

	return &settings, nil
}

func (p *Plugin) startMeeting(user *model.User, channel *model.Channel, meetingID string, meetingTopic string, personal bool, rootID string) (string, error) {
	l := p.b.GetServerLocalizer()
	if meetingID == "" {
		meetingID = encodeJitsiMeetingID(meetingTopic)
		if meetingID != "" {
			meetingID += "-"
		}
		meetingID += randomString(LETTERS, 20)
	}

	meetingPersonal := false
	defaultSelectedMeetingTopic := "Jitsi Meeting"
	if p.getConfiguration().UseJaaS {
		defaultSelectedMeetingTopic = "JaaS Meeting"
	}

	defaultMeetingTopic := p.b.LocalizeDefaultMessage(l, &i18n.Message{
		ID:    "jitsi.start_meeting.default_meeting_topic",
		Other: defaultSelectedMeetingTopic,
	})

	if len(meetingTopic) < 1 {
		userConfig, err := p.getUserConfig(user.Id)
		if err != nil {
			return "", err
		}

		switch userConfig.NamingScheme {
		case jitsiNameSchemeWords:
			meetingID = generateEnglishTitleName()
		case jitsiNameSchemeUUID:
			meetingID = generateUUIDName()
		case jitsiNameSchemeMattermost:
			if channel.Type == model.CHANNEL_DIRECT || channel.Type == model.CHANNEL_GROUP {
				meetingID = generatePersonalMeetingName(user.Username)
				meetingTopic = p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
					DefaultMessage: &i18n.Message{
						ID:    "jitsi.start_meeting.personal_meeting_topic",
						Other: "{{.Name}}'s Personal Meeting",
					},
					TemplateData: map[string]string{"Name": user.GetDisplayName(model.SHOW_NICKNAME_FULLNAME)},
				})
				meetingPersonal = true
			} else {
				team, teamErr := p.API.GetTeam(channel.TeamId)
				if teamErr != nil {
					return "", teamErr
				}
				meetingTopic = p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
					DefaultMessage: &i18n.Message{
						ID:    "jitsi.start_meeting.channel_meeting_topic",
						Other: "{{.ChannelName}} Channel Meeting",
					},
					TemplateData: map[string]string{"ChannelName": channel.DisplayName},
				})
				meetingID = generateTeamChannelName(team.Name, channel.Name)
			}
		default:
			meetingID = generateEnglishTitleName()
		}
	}

	meetingIDLabel := meetingID

	if p.getConfiguration().UseJaaS {
		appID := p.getConfiguration().JaaSAppID
		meetingID = appID + "/" + meetingID
	}

	jitsiURL := strings.TrimSpace(p.getConfiguration().GetJitsiURL())

	if p.getConfiguration().UseJaaS {
		jitsiURL = strings.TrimSpace(*p.API.GetConfig().ServiceSettings.SiteURL + "/plugins/jitsi/api/v1/meetings")
	}

	jitsiURL = strings.TrimRight(jitsiURL, "/")
	meetingURL := jitsiURL + "/" + meetingID
	meetingLink := meetingURL

	var meetingLinkValidUntil = time.Time{}
	JWTMeeting := p.getConfiguration().JitsiJWT || p.getConfiguration().UseJaaS
	var jwtToken string

	meetingUntil := ""

	if p.getConfiguration().UseJaaS {
		meetingLinkValidUntil = time.Now().Add(time.Duration(120) * time.Minute)

		var err2 error
		jwtToken, err2 = p.generateJaaSJwtForUser(user)
		if err2 != nil {
			return "", err2
		}

		meetingURL = meetingURL + "?jwt=" + jwtToken

		meetingUntil = p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID:    "jitsi.start_meeting.meeting_link_valid_until",
				Other: "Meeting link valid until: {{.Datetime}}",
			},
			TemplateData: map[string]string{"Datetime": meetingLinkValidUntil.Format("Mon Jan 2 15:04:05 -0700 MST 2006")},
		})
	} else {
		if JWTMeeting {
			// Error check is done in configuration.IsValid()
			jURL, _ := url.Parse(p.getConfiguration().GetJitsiURL())

			meetingLinkValidUntil = time.Now().Add(time.Duration(p.getConfiguration().JitsiLinkValidTime) * time.Minute)

			claims := Claims{}
			claims.Issuer = p.getConfiguration().JitsiAppID
			claims.Audience = []string{p.getConfiguration().JitsiAppID}
			claims.ExpiresAt = jwt.NewNumericDate(meetingLinkValidUntil)
			claims.Subject = jURL.Hostname()
			claims.Room = meetingID

			var err2 error
			jwtToken, err2 = signClaims(p.getConfiguration().JitsiAppSecret, &claims)
			if err2 != nil {
				return "", err2
			}

			meetingURL = meetingURL + "?jwt=" + jwtToken
		}

		if JWTMeeting {
			meetingUntil = p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
				DefaultMessage: &i18n.Message{
					ID:    "jitsi.start_meeting.meeting_link_valid_until",
					Other: "Meeting link valid until: {{.Datetime}}",
				},
				TemplateData: map[string]string{"Datetime": meetingLinkValidUntil.Format("Mon Jan 2 15:04:05 -0700 MST 2006")},
			})
		}
	}

	if meetingTopic == "" {
		meetingURL = meetingURL + "#config.callDisplayName=" + url.PathEscape("\""+defaultMeetingTopic+"\"")
	} else {
		meetingURL = meetingURL + "#config.callDisplayName=" + url.PathEscape("\""+meetingTopic+"\"")
	}

	meetingTypeString := p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
		DefaultMessage: &i18n.Message{
			ID:    "jitsi.start_meeting.meeting_id",
			Other: "Meeting ID",
		},
	})
	if meetingPersonal {
		meetingTypeString = p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID:    "jitsi.start_meeting.personal_meeting_id",
				Other: "Personal Meeting ID (PMI)",
			},
		})
	}

	slackMeetingTopic := meetingTopic
	if slackMeetingTopic == "" {
		slackMeetingTopic = defaultMeetingTopic
	}

	slackAttachment := model.SlackAttachment{
		Fallback: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID: "jitsi.start_meeting.fallback_text",
				Other: `Video Meeting started at [{{.MeetingID}}]({{.MeetingURL}}).

[Join Meeting]({{.MeetingURL}})`,
			},
			TemplateData: map[string]string{
				"MeetingID":  meetingID,
				"MeetingURL": meetingURL,
			},
		}) + "\n\n" + meetingUntil,
		Title: slackMeetingTopic,
		Text: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID: "jitsi.start_meeting.slack_attachment_text",
				Other: `{{.MeetingType}}: [{{.MeetingID}}]({{.MeetingURL}})

[Join Meeting]({{.MeetingURL}})`,
			},
			TemplateData: map[string]string{
				"MeetingType": meetingTypeString,
				"MeetingID":   meetingID,
				"MeetingURL":  meetingURL,
			},
		}) + "\n\n" + meetingUntil,
	}

	post := &model.Post{
		UserId:    user.Id,
		ChannelId: channel.Id,
		Type:      "custom_jitsi",
		Props: map[string]interface{}{
			"attachments":             []*model.SlackAttachment{&slackAttachment},
			"meeting_id":              meetingID,
			"meeting_link":            meetingLink,
			"jwt_meeting":             JWTMeeting,
			"meeting_jwt":             jwtToken,
			"jwt_meeting_valid_until": meetingLinkValidUntil.Unix(),
			"meeting_personal":        meetingPersonal,
			"meeting_topic":           meetingTopic,
			"default_meeting_topic":   defaultMeetingTopic,
			"jaas_meeting":            p.getConfiguration().UseJaaS,
			"meeting_id_label":        meetingIDLabel,
		},
		RootId: rootID,
	}

	if _, err := p.API.CreatePost(post); err != nil {
		return "", err
	}

	return meetingID, nil
}

// MarshalBinary default marshaling to JSON.
func (c Claims) MarshalBinary() (data []byte, err error) {
	return json.Marshal(c)
}

func encodeJitsiMeetingID(meeting string) string {
	reg := regexp.MustCompile("[^a-zA-Z0-9-_]+")
	meeting = strings.ReplaceAll(meeting, " ", "-")
	return reg.ReplaceAllString(meeting, "")
}

func (p *Plugin) askMeetingType(user *model.User, channel *model.Channel, rootID string) error {
	l := p.b.GetUserLocalizer(user.Id)
	apiURL := *p.API.GetConfig().ServiceSettings.SiteURL + "/plugins/jitsi/api/v1/meetings"

	actions := []*model.PostAction{}

	var team *model.Team
	if channel.TeamId != "" {
		team, _ = p.API.GetTeam(channel.TeamId)
	}

	actions = append(actions, &model.PostAction{
		Name: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID:    "jitsi.ask.meeting_name_random_words",
				Other: "Meeting name with random words",
			},
		}),
		Integration: &model.PostActionIntegration{
			URL: apiURL,
			Context: map[string]interface{}{
				"meeting_id":    generateEnglishTitleName(),
				"meeting_topic": "Jitsi Meeting",
				"personal":      true,
			},
		},
	})

	actions = append(actions, &model.PostAction{
		Name: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID:    "jitsi.ask.personal_meeting",
				Other: "Personal meeting",
			},
		}),
		Integration: &model.PostActionIntegration{
			URL: apiURL,
			Context: map[string]interface{}{
				"meeting_id":    generatePersonalMeetingName(user.Username),
				"meeting_topic": fmt.Sprintf("%s's Meeting", user.GetDisplayName(model.SHOW_NICKNAME_FULLNAME)),
				"personal":      true,
			},
		},
	})

	if channel.Type == model.CHANNEL_OPEN || channel.Type == model.CHANNEL_PRIVATE {
		actions = append(actions, &model.PostAction{
			Name: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
				DefaultMessage: &i18n.Message{
					ID:    "jitsi.ask.channel_meeting",
					Other: "Channel meeting",
				},
			}),
			Integration: &model.PostActionIntegration{
				URL: apiURL,
				Context: map[string]interface{}{
					"meeting_id":    generateTeamChannelName(team.Name, channel.Name),
					"meeting_topic": fmt.Sprintf("%s Channel Meeting", channel.DisplayName),
					"personal":      false,
				},
			},
		})
	}

	actions = append(actions, &model.PostAction{
		Name: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID:    "jitsi.ask.uuid_meeting",
				Other: "Meeting name with UUID",
			},
		}),
		Integration: &model.PostActionIntegration{
			URL: apiURL,
			Context: map[string]interface{}{
				"meeting_id":    generateUUIDName(),
				"meeting_topic": "Jitsi Meeting",
				"personal":      false,
			},
		},
	})

	sa := model.SlackAttachment{
		Title: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID:    "jitsi.ask.title",
				Other: "Jitsi Meeting Start",
			},
		}),
		Text: p.b.LocalizeWithConfig(l, &i18n.LocalizeConfig{
			DefaultMessage: &i18n.Message{
				ID:    "jitsi.ask.select_meeting_type",
				Other: "Select type of meeting you want to start",
			},
		}),
		Actions: actions,
	}

	post := &model.Post{
		UserId:    p.botID,
		ChannelId: channel.Id,
		RootId:    rootID,
	}
	post.SetProps(map[string]interface{}{
		"attachments": []*model.SlackAttachment{&sa},
	})
	_ = p.API.SendEphemeralPost(user.Id, post)

	return nil
}

func (p *Plugin) getUserConfig(userID string) (*UserConfig, error) {
	data, appErr := p.API.KVGet("config_" + userID)
	if appErr != nil {
		return nil, appErr
	}

	if data == nil {
		return &UserConfig{
			Embedded:     p.getConfiguration().JitsiEmbedded,
			NamingScheme: p.getConfiguration().JitsiNamingScheme,
		}, nil
	}

	var userConfig UserConfig
	err := json.Unmarshal(data, &userConfig)
	if err != nil {
		return nil, err
	}

	return &userConfig, nil
}

func (p *Plugin) setUserConfig(userID string, config *UserConfig) error {
	b, err := json.Marshal(config)
	if err != nil {
		return err
	}

	appErr := p.API.KVSet("config_"+userID, b)
	if appErr != nil {
		return appErr
	}

	p.API.PublishWebSocketEvent(configChangeEvent, nil, &model.WebsocketBroadcast{UserId: userID})
	return nil
}
