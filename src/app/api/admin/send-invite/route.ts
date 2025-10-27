import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json();

    // Example using Resend (install: npm install resend)
    // Or use SendGrid, AWS SES, etc.
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #0ea5e9); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ArbiBase Portal</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Your ArbiBase operator account has been created! You now have access to our verified property platform.</p>
              
              <div class="credentials">
                <h3 style="margin-top: 0;">Your Login Credentials</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${password}</code></p>
              </div>

              <p>⚠️ <strong>Important:</strong> Please change your password immediately after your first login.</p>

              <a href="https://arbibase-portal.vercel.app/login" class="button">
                Sign In to Portal
              </a>

              <p>If you have any questions, reply to this email or contact our support team.</p>

              <div class="footer">
                <p>© ${new Date().getFullYear()} ArbiBase. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Example: Send via your email service
    // await resend.emails.send({
    //   from: 'ArbiBase <noreply@arbibase.com>',
    //   to: email,
    //   subject: 'Welcome to ArbiBase Portal - Your Account is Ready',
    //   html: emailHtml
    // });

    // For now, just log it (replace with actual email service)
    console.log("Invite email would be sent to:", email);
    console.log("Password:", password);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send invite email" },
      { status: 500 }
    );
  }
}
