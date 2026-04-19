/**
 * Templates HTML pour emails transactionnels. Pas de moteur de templating
 * externe — les templates sont des fonctions pures qui retournent du HTML
 * inline safe (valeurs escapées via `esc`).
 *
 * Compatible clients email (Gmail, Outlook, Apple Mail) : pas de CSS externe,
 * pas de font import, pas de flex ; tables + inline styles.
 */

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

interface EmailShellInput {
  title: string
  preheader: string
  bodyHtml: string
  primaryAction?: {
    label: string
    url: string
  }
  footerCompany?: string
  appUrl?: string
}

function shell({
  title,
  preheader,
  bodyHtml,
  primaryAction,
  footerCompany = 'Wyzlee',
  appUrl = 'https://seo-geo-orcin.vercel.app',
}: EmailShellInput): string {
  const actionBlock = primaryAction
    ? `
      <tr>
        <td style="padding:24px 0 8px 0;">
          <a href="${esc(primaryAction.url)}"
             style="display:inline-block;background:#ff6b2c;color:#ffffff;text-decoration:none;
                    padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
            ${esc(primaryAction.label)}
          </a>
        </td>
      </tr>`
    : ''

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1e2c;">
  <!-- Preheader (invisible preview in inbox) -->
  <div style="display:none;max-height:0;overflow:hidden;">${esc(preheader)}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <div style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#ff6b2c;font-weight:600;">
                SEO-GEO
              </div>
              <h1 style="margin:6px 0 0 0;font-size:22px;line-height:1.3;color:#1a1e2c;">
                ${esc(title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 24px 32px;font-size:15px;line-height:1.6;color:#1a1e2c;">
              ${bodyHtml}
              ${actionBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px 32px;border-top:1px solid #eef0f4;font-size:12px;color:#5c6a7e;">
              Envoyé par ${esc(footerCompany)} — <a href="${esc(appUrl)}" style="color:#5c6a7e;">${esc(appUrl.replace(/^https?:\/\//, ''))}</a>
              <br>
              Si vous ne souhaitez plus recevoir ces notifications, écrivez à
              <a href="mailto:contact@wyzlee.com" style="color:#5c6a7e;">contact@wyzlee.com</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface AuditCompletedEmailInput {
  recipientName?: string | null
  auditId: string
  clientName?: string | null
  targetUrl?: string | null
  scoreTotal: number
  auditUrl: string
  shareUrl?: string | null
  companyName?: string | null
  appUrl?: string | null
}

export function auditCompletedEmail(input: AuditCompletedEmailInput): {
  subject: string
  html: string
  text: string
} {
  const auditLabel = input.clientName || input.targetUrl || 'votre audit'
  const greeting = input.recipientName
    ? `Bonjour ${esc(input.recipientName)},`
    : 'Bonjour,'
  const scoreRounded = Math.round(input.scoreTotal)

  const bodyHtml = `
    <p style="margin:0 0 12px 0;">${greeting}</p>
    <p style="margin:0 0 12px 0;">
      L'audit <strong>${esc(auditLabel)}</strong> est terminé.
      Score global : <strong>${scoreRounded}/100</strong>.
    </p>
    <p style="margin:0 0 12px 0;">
      Vous pouvez consulter le détail des 11 phases, les constats classés par
      sévérité et la feuille de route proposée depuis votre tableau de bord.
    </p>
    ${
      input.shareUrl
        ? `<p style="margin:0 0 12px 0;">
             Un lien public de partage est également disponible pour votre
             client : <a href="${esc(input.shareUrl)}" style="color:#ff6b2c;">${esc(input.shareUrl)}</a>
           </p>`
        : ''
    }
  `

  const html = shell({
    title: 'Votre audit est prêt',
    preheader: `Audit ${auditLabel} — score ${scoreRounded}/100`,
    bodyHtml,
    primaryAction: {
      label: 'Consulter le rapport',
      url: input.auditUrl,
    },
    footerCompany: input.companyName || 'Wyzlee',
    appUrl: input.appUrl || 'https://seo-geo-orcin.vercel.app',
  })

  const subject = `Audit terminé — ${auditLabel} (${scoreRounded}/100)`

  const text = [
    greeting,
    '',
    `L'audit ${auditLabel} est terminé. Score global : ${scoreRounded}/100.`,
    '',
    `Consulter le rapport : ${input.auditUrl}`,
    input.shareUrl ? `Lien de partage client : ${input.shareUrl}` : '',
    '',
    `— ${input.companyName || 'Wyzlee'}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
