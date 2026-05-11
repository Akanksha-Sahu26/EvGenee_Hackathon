const nodemailer = require('nodemailer');
const { NODEMAILER_USER, NODEMAILER_PASS, NODEMAILER_PORT } = require('../config/config');

const transporter = nodemailer.createTransport({
    secure: true,
    host: "smtp.gmail.com",
    port: Number(NODEMAILER_PORT),
    auth: {
        user: NODEMAILER_USER,
        pass: NODEMAILER_PASS
    }
});

/**
 * Generates a professional branded HTML template for EvGenee
 * @param {string} title - The heading of the email
 * @param {string} content - The main body content (HTML allowed)
 * @returns {string} Branded HTML string
 */
const generateEmailTemplate = (title, content) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EvGenee Notification</title>
        <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333; }
            .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f6; padding-bottom: 40px; }
            .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            .header { background-color: #000814; padding: 30px; text-align: center; }
            .logo-text { color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
            .logo-accent { color: #22c55e; }
            .content { padding: 40px 30px; line-height: 1.6; }
            .title { font-size: 22px; font-weight: 700; color: #000814; margin-bottom: 20px; }
            .otp-box { background-color: #f0fff4; border: 2px dashed #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 36px; font-weight: 800; color: #22c55e; letter-spacing: 8px; margin: 0; }
            .footer { background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #edf2f7; }
            .footer-text { font-size: 12px; color: #64748b; margin-bottom: 10px; }
            .social-links { margin-top: 20px; }
            .social-link { display: inline-block; margin: 0 10px; color: #22c55e; text-decoration: none; font-weight: 600; font-size: 13px; }
            .btn { display: inline-block; padding: 12px 30px; background-color: #22c55e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <table class="main">
                <tr>
                    <td class="header">
                        <h1 class="logo-text">Ev<span class="logo-accent">Genee</span></h1>
                    </td>
                </tr>
                <tr>
                    <td class="content">
                        <h2 class="title">${title}</h2>
                        ${content}
                    </td>
                </tr>
                <tr>
                    <td class="footer">
                        <p class="footer-text">© ${new Date().getFullYear()} EvGenee Network Pvt. Ltd. All rights reserved.</p>
                        <p class="footer-text">Bhopal, Madhya Pradesh, India</p>
                        <div class="social-links">
                            <a href="#" class="social-link">Website</a>
                            <a href="#" class="social-link">Privacy Policy</a>
                            <a href="#" class="social-link">Support</a>
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </body>
    </html>
    `;
};

const sendEmail = async ({ to, subject, title, content }) => {
    try {
        const html = generateEmailTemplate(title, content);
        const info = await transporter.sendMail({
            from: `"EvGenee Support" <${NODEMAILER_USER}>`,
            to,
            subject,
            html
        });
        console.log(`[EmailService] Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error(`[EmailService] Error sending email:`, error.message);
        throw error;
    }
};

module.exports = {
    sendEmail,
    generateEmailTemplate
};
