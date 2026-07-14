export const LOGIN_FIELDS = [
  {
    id: 'email',
    label: '帳號',
    icon: 'mail',
    type: 'text',
    placeholder: '請輸入帳號(Email)',
    autocomplete: 'username'
  },
  {
    id: 'password',
    label: '密碼',
    icon: 'lock',
    type: 'password',
    placeholder: '請輸入密碼',
    autocomplete: 'current-password'
  }
]

export const SIGNUP_FIELDS = [
  {
    id: 'fullName',
    label: '姓名',
    icon: 'person',
    type: 'text',
    placeholder: '真實姓名 (必填)',
    autocomplete: 'name'
  },
  {
    id: 'email',
    label: 'Email',
    icon: 'mail',
    type: 'email',
    placeholder: 'Email (必填)',
    autocomplete: 'username'
  },
  {
    id: 'password',
    label: '密碼',
    icon: 'lock',
    type: 'password',
    placeholder: '設定密碼',
    autocomplete: 'new-password'
  },
  {
    id: 'confirmPassword',
    label: '確認密碼',
    icon: 'lock_reset',
    type: 'password',
    placeholder: '確認密碼',
    autocomplete: 'new-password'
  }
]

