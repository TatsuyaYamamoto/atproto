import { FetchResponseError, Json, peekJson } from '@atproto-labs/fetch'
import { Account, Session } from '../backend-data'

export class Api {
  constructor(
    private csrfToken: string,
    private newSessionsRequireConsent: boolean,
  ) {}

  async fetch<R extends Json | void = Json | void>(
    path: `/${string}`,
    payload: Json,
  ): Promise<R> {
    const response = await fetch(`/oauth/authorize${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': this.csrfToken,
      },
      mode: 'same-origin',
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      try {
        if (response.status === 204) return undefined as R
        return (await response.json()) as R
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : undefined
        throw new FetchResponseError(response, undefined, message, { cause })
      }
    }

    try {
      const json = await peekJson(response).catch(() => undefined)

      if (response.status === 400 && isInvalidCredentials(json)) {
        throw new InvalidCredentialsError()
      } else if (response.status === 401 && isSecondFactorRequired(json)) {
        throw new SecondAuthenticationFactorRequiredError(json.type, json.hint)
      } else {
        throw await FetchResponseError.from(response)
      }
    } finally {
      response.body?.cancel()
    }
  }

  async signIn(credentials: {
    username: string
    password: string
    remember?: boolean
  }): Promise<Session> {
    const json = await this.fetch<{
      account: Account
      consentRequired: boolean
    }>('/sign-in', { credentials })

    return {
      account: json.account,

      selected: true,
      loginRequired: false,
      consentRequired: this.newSessionsRequireConsent || json.consentRequired,
    }
  }

  async resetPasswordRequest(email: string) {
    return this.fetch<void>('/reset-password-request', { email })
  }

  async resetPasswordConfirm(token: string, password: string) {
    return this.fetch<void>('/reset-password-confirm', { token, password })
  }

  async accept(account: Account): Promise<URL> {
    const url = new URL('/oauth/authorize/accept', window.origin)
    url.searchParams.set('account_sub', account.sub)
    url.searchParams.set('csrf_token', this.csrfToken)

    return url
  }

  async reject(): Promise<URL> {
    const url = new URL('/oauth/authorize/reject', window.origin)
    url.searchParams.set('csrf_token', this.csrfToken)

    return url
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid credentials')
  }
}

export class SecondAuthenticationFactorRequiredError extends Error {
  constructor(
    public type: 'emailOtp',
    public hint: string,
  ) {
    super(`${type} authentication factor required (hint: ${hint})`)
  }
}

function isSecondFactorRequired(json: unknown): json is {
  error: 'second_authentication_factor_required'
  type: 'emailOtp'
  hint: string
} {
  return (
    json != null &&
    json['error'] === 'second_authentication_factor_required' &&
    json['type'] === 'emailOtp' &&
    typeof json['hint'] === 'string'
  )
}

function isInvalidCredentials(json: unknown): json is {
  error: 'invalid_request'
  error_description: 'Invalid credentials'
} {
  return (
    json != null &&
    json['error'] === 'invalid_request' &&
    json['error_description'] === 'Invalid credentials'
  )
}
