import { ServerClient } from 'postmark';
import { serverEnv } from './env-server';

/**
 * Helper to safely create Postmark client if token exists
 */
function getPostmarkClient(): ServerClient | null {
  if (!serverEnv.POSTMARK_SERVER_TOKEN) {
    console.warn('POSTMARK_SERVER_TOKEN not set. Email sending is disabled.');
    return null;
  }
  
  return new ServerClient(serverEnv.POSTMARK_SERVER_TOKEN);
}

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  const client = getPostmarkClient();
  
  if (!client) {
    return false; // No-op if client not available
  }
  
  try {
    const result = await client.sendEmail({
      From: 'academy@imaginehumans.ai',
      To: email,
      Subject: 'Welcome to ImagineHumans Academy',
      TextBody: `
        Hello ${name},
        
        Welcome to ImagineHumans Academy! We're excited to have you join our community.
        
        Here are some quick steps to get started:
        1. Visit your Dashboard: https://academy.imaginehumans.ai/dashboard
        2. Explore our Classroom: https://academy.imaginehumans.ai/classroom
        3. Begin your learning journey by selecting a course
        
        If you have any questions, simply reply to this email.
        
        Happy learning!
        
        The ImagineHumans Team
      `,
      HtmlBody: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #55b7f5;">Welcome to ImagineHumans Academy!</h1>
          <p>Hello ${name},</p>
          <p>We're excited to have you join our community.</p>
          
          <h2>Here are some quick steps to get started:</h2>
          <ol>
            <li><a href="https://academy.imaginehumans.ai/dashboard">Visit your Dashboard</a></li>
            <li><a href="https://academy.imaginehumans.ai/classroom">Explore our Classroom</a></li>
            <li>Begin your learning journey by selecting a course</li>
          </ol>
          
          <p>If you have any questions, simply reply to this email.</p>
          
          <p><strong>Happy learning!</strong></p>
          <p>The ImagineHumans Team</p>
        </div>
      `,
    });
    
    return result.Message === 'OK';
  } catch (error) {
    console.error('Failed to send welcome email', error);
    return false;
  }
}
