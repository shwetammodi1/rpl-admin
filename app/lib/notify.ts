// Section 4.6 — internal notifications service (email & SMS).
// One helper the API calls on key events. Sends are best-effort and non-blocking:
// if no provider key is configured the message is logged instead of sent, so the
// portal works end-to-end before email/SMS providers are wired up.

export type NotifyChannel = 'email' | 'sms'
export type NotifyTemplate = 'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'role_granted'

type TemplateData = Record<string, string | number | undefined>

function render(template: NotifyTemplate, name: string, data: TemplateData): { subject: string; body: string } {
  const first = name.split(' ')[0] || name
  switch (template) {
    case 'leave_submitted':
      return {
        subject: 'Leave request received',
        body: `Hi ${first}, your ${data.type} leave from ${data.fromDate} has been submitted and is awaiting HR review.`,
      }
    case 'leave_approved':
      return {
        subject: 'Leave approved',
        body: `Hi ${first}, your ${data.type} leave from ${data.fromDate} has been approved.`,
      }
    case 'leave_rejected':
      return {
        subject: 'Leave request rejected',
        body: `Hi ${first}, your leave request was rejected.${data.comment ? ` Reason: ${data.comment}` : ''}`,
      }
    case 'role_granted':
      return {
        subject: 'Portal access granted',
        body: `Hi ${first}, your account has been granted ${data.role} access. You can now sign in to the RPL Maheshwari portal.`,
      }
  }
}

async function sendEmail(env: Env, to: string, subject: string, body: string) {
  if (!env.RESEND_API_KEY) {
    console.log(`[email:no-provider] to=${to} subject="${subject}" body="${body}"`)
    return
  }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.RESEND_FROM ?? 'RPL Maheshwari <no-reply@rplmaheshwari.com>',
      to: [to],
      subject,
      text: body,
    }),
  }).catch((err) => console.error('[email:error]', err))
}

async function sendSms(env: Env, to: string, body: string) {
  // No phone column exists on users yet; log until a number + DLT provider are wired.
  if (!env.MSG91_AUTHKEY) {
    console.log(`[sms:no-provider] to=${to} body="${body}"`)
    return
  }
  console.log(`[sms:pending-phone-field] to=${to} body="${body}"`)
}

export async function sendNotification(
  env: Env,
  userId: string,
  channel: NotifyChannel,
  template: NotifyTemplate,
  data: TemplateData = {}
) {
  const user = await env.DB.prepare('SELECT name, email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ name: string; email: string }>()
  if (!user) return

  const { subject, body } = render(template, user.name, data)
  if (channel === 'email') await sendEmail(env, user.email, subject, body)
  else await sendSms(env, user.email, body)
}

// Fire-and-forget on the Workers execution context so the API responds fast.
export function notifyAsync(c: { executionCtx?: { waitUntil?: (p: Promise<unknown>) => void } }, p: Promise<unknown>) {
  const wu = c.executionCtx?.waitUntil
  if (typeof wu === 'function') wu.call(c.executionCtx, p.catch(() => {}))
  else void p.catch(() => {})
}
