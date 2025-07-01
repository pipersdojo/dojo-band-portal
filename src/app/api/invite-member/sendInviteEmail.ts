import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInviteEmail({ to, bandName, inviteLink }: { to: string; bandName: string; inviteLink: string }) {
  return resend.emails.send({
    from: 'Dojo Band Portal <noreply@dojomail.us>',
    to,
    subject: `You\'re invited to join ${bandName}!`,
    html: `<p>You have been invited to join <b>${bandName}</b> on Dojo Band Portal.</p>
           <p><a href=\"${inviteLink}\">Click here to accept your invite</a></p>
           <p>This invite will expire in 7 days.</p>`
  });
}
