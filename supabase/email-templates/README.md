# Supabase 電郵範本（中文）

喺 Supabase → Authentication → Emails → Templates，逐個範本貼上：

| Supabase 範本 | 主旨（Subject） | 內容（Body）檔案 |
|---|---|---|
| Confirm signup | `請確認閣下的電郵地址｜Tom's Violin Studio` | `confirm-signup.html` |
| Reset password | `重設密碼｜Tom's Violin Studio` | `reset-password.html` |
| Change email address | `確認更改電郵地址｜Tom's Violin Studio` | `change-email.html` |
| Magic link | `登入連結｜Tom's Violin Studio` | `magic-link.html` |

`{{ .ConfirmationURL }}` 等係 Supabase 嘅變數，唔好改。
