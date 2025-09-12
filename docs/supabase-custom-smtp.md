# Configure Supabase to Use Custom SMTP (Resend)

## Why Configure Custom SMTP?

By default, Supabase uses a shared email service for authentication emails with strict rate limits:
- 3 emails per hour for free projects
- Sent from `noreply@mail.app.supabase.io` or similar
- Often marked as spam

Using your own SMTP removes these limitations and improves deliverability.

## Steps to Configure Resend SMTP in Supabase

### 1. Get Resend SMTP Credentials

1. Go to [Resend Dashboard](https://resend.com/settings/smtp)
2. Your SMTP settings should be:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: `resend`
   - **Password**: Your Resend API key (same as `RESEND_API_KEY`)

### 2. Configure Supabase SMTP

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Settings** → **Auth**
4. Scroll down to **SMTP Settings**
5. Toggle **Enable Custom SMTP** to ON
6. Enter the following:

```
Sender email: noreply@updates.aloa.agency
Sender name: Aloa Agency
Host: smtp.resend.com
Port: 587
Username: resend
Password: [Your RESEND_API_KEY]
Secure: TLS (or STARTTLS)
```

7. Click **Save**

### 3. Update Email Templates (Optional)

While in the Auth settings, you can also customize the email templates:

1. Scroll to **Email Templates**
2. Customize each template:
   - **Confirm signup** - When users create an account
   - **Reset password** - Password reset emails
   - **Magic Link** - Passwordless login emails
   - **Change Email Address** - Email change confirmation
   - **Invite User** - Team invitation emails

Example for Reset Password:
```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>You requested to reset your password. Click the link below to set a new password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request this, please ignore this email.</p>
<p>Best regards,<br>The Aloa Team</p>
```

### 4. Update Redirect URLs

Make sure your Auth redirect URLs are configured:

1. In Supabase Dashboard → Settings → Auth
2. Under **Site URL**, add: `https://your-domain.com`
3. Under **Redirect URLs**, add:
   - `http://localhost:3000/**`
   - `http://localhost:3001/**`
   - `https://your-domain.com/**`
   - `https://custom-forms-xi.vercel.app/**`

## Benefits After Configuration

✅ No rate limits on authentication emails
✅ Emails sent from `noreply@updates.aloa.agency`
✅ Better deliverability and less spam filtering
✅ Professional appearance with your domain
✅ Custom email templates matching your brand

## Testing

After configuration:
1. Try sending a password reset email
2. Check that it comes from `noreply@updates.aloa.agency`
3. Verify no rate limit errors
4. Test all auth flows (signup, reset password, magic link)

## Troubleshooting

If emails aren't sending:
1. Verify your Resend API key is correct
2. Check that `updates.aloa.agency` is verified in Resend
3. Try port 465 with SSL if 587 with TLS doesn't work
4. Check Supabase logs in Dashboard → Logs → Auth