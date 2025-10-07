import { Resend } from 'resend';

const resend = new Resend('re_6nWErpzF_EqWvPizSKzbZm21LxkFhgEaq');

async function testEmail() {
  try {
    const data = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'chris@synqforge.com',
      subject: 'Hello World',
      html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
    });

    console.log('✅ Email sent successfully!');
    console.log('Email ID:', data.id);
    console.log('Response:', data);
  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

testEmail();
