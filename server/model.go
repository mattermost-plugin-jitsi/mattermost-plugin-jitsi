package main

import (
	"github.com/cristalhq/jwt/v3"
)

type UserConfig struct {
	Embedded     bool   `json:"embedded"`
	NamingScheme string `json:"naming_scheme"`
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
