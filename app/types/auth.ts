export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  fullName: string
  password: string
  confirmPassword: string
}

export interface SocialSignupField {
  key: 'email' | 'fullName'
  label: string
  icon: string
  type: string
  placeholder: string
  helperText?: string
}