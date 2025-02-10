import { SyntheticEvent, useRef, useState } from 'react'
import { useRandomString } from '../hooks/use-random-string'
import { Override } from '../lib/util'
import { Fieldset } from './fieldset'
import FormCardAsync, { FormCardAsyncProps } from './form-card-async'
import { LockIcon } from './icons/lock-icon'
import { InputOtp } from './input-otp'
import { InputText } from './input-text'

export type ResetPasswordConfirmFormProps = Override<
  FormCardAsyncProps,
  {
    onSubmit: (token: string, password: string) => void | PromiseLike<void>

    tokenAria?: string
    tokenLabel?: string
    tokenPlaceholder?: string
    tokenPattern?: string
    tokenFormat?: string
    tokenParseValue?: (value: string) => string | false

    passwordAria?: string
    passwordLabel?: string
    passwordPlaceholder?: string
    passwordPattern?: string
  }
>

export function ResetPasswordConfirmForm({
  onSubmit,

  tokenLabel = 'Reset code',
  tokenAria = 'You will receive an email with a "reset code". enter that code here then enter your new password.',

  passwordAria = 'Enter your new password',
  passwordLabel = 'New password',
  passwordPlaceholder = 'Enter a password',
  passwordPattern,

  ...props
}: ResetPasswordConfirmFormProps) {
  const tokenAriaId = useRandomString({ prefix: 'reset-pwd-email-' })
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)

  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState<string>('')

  const doSubmit = async (
    event: SyntheticEvent<
      HTMLFormElement & {
        code: HTMLInputElement
        password: HTMLInputElement
      },
      SubmitEvent
    >,
  ) => {
    event.preventDefault()
    if (token && password) await onSubmit(token, password)
  }

  return (
    <FormCardAsync {...props} onLoading={setLoading} onSubmit={doSubmit}>
      <p id={tokenAriaId} className="text-sm">
        {tokenAria}
      </p>

      <Fieldset title={tokenLabel} disabled={loading}>
        <InputOtp
          name="code"
          aria-labelledby={tokenAriaId}
          enterKeyHint="next"
          required
          autoFocus={true}
          onOtp={(token) => {
            setToken(token)
            // Auto-focus next field when token is complete
            if (token) passwordRef.current?.focus()
          }}
        />
      </Fieldset>

      <Fieldset title={passwordLabel} disabled={loading}>
        <InputText
          ref={passwordRef}
          icon={<LockIcon className="w-5" />}
          name="password"
          type="password"
          placeholder={passwordPlaceholder}
          aria-labelledby={passwordAria}
          title={passwordLabel}
          pattern={passwordPattern}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="new-password"
          dir="auto"
          enterKeyHint="done"
          spellCheck="false"
          required
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
      </Fieldset>
    </FormCardAsync>
  )
}
