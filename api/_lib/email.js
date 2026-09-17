import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey && !resendApiKey.includes('your_resend') && !resendApiKey.includes('placeholder')
  ? new Resend(resendApiKey)
  : null;

export const adminNotificationEmail = process.env.ADMIN_EMAIL || 'architects.kpa@gmail.com';

export async function sendAdminNotification(enquiry) {
  const displayRef = (enquiry.id && typeof enquiry.id === 'string')
    ? `KPA-${enquiry.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
    : (enquiry.consultation_ref || 'N/A');

  const subject = `New Project Enquiry — K.P. Architects (${enquiry.location || 'India'})`;
  const textContent = `
NEW KPA PROJECT ENQUIRY

Enquiry ID: ${enquiry.id || displayRef}
Reference: ${displayRef}
Submitted: ${new Date(enquiry.created_at || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Client Information:
• Name: ${enquiry.name}
• Email: ${enquiry.email}
• Phone: ${enquiry.phone}
• Organization: ${enquiry.organization || 'N/A'}

Project Details:
• Project Type: ${enquiry.project_type}
• Location: ${enquiry.location}
• Disciplines: ${Array.isArray(enquiry.disciplines) ? enquiry.disciplines.join(', ') : enquiry.disciplines || 'N/A'}
• Built-up Scale: ${enquiry.scale || 'N/A'}

Message / Brief:
${enquiry.message || 'No additional message provided.'}

Status: ${(enquiry.status || 'new').toUpperCase()}
Priority: ${(enquiry.priority || 'normal').toUpperCase()}
  `.trim();

  if (resend) {
    try {
      await resend.emails.send({
        from: 'K.P. Architects <onboarding@resend.dev>',
        to: adminNotificationEmail,
        subject: subject,
        text: textContent
      });
      console.log(`✓ Admin email notification sent via Resend to ${adminNotificationEmail}`);
    } catch (err) {
      console.error('Error sending Resend email notification:', err);
    }
  } else {
    console.log('\n--- [ADMIN NOTIFICATION DISPATCHED] ---');
    console.log(`To: ${adminNotificationEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(textContent);
    console.log('----------------------------------------\n');
  }
}
