import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const user = this.configService.get<string>('mail.user');
    const pass = this.configService.get<string>('mail.pass');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }

  async sendMail(to: string, subject: string, text: string, html?: string) {
    const from = this.configService.get<string>('mail.from');
    try {
      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email successfully sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async sendOtp(to: string, otp: string) {
    const subject = 'Your OTP Code';
    const text = `Your OTP code for verification is: ${otp}. This code is valid for 5 minutes.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #0d5c3a; text-align: center;">B2B ERP Platform OTP</h2>
        <p>Dear User,</p>
        <p>Your one-time password (OTP) for logging in is:</p>
        <div style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; background-color: #f4fbf7; border-radius: 5px; color: #0d5c3a; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code is valid for <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777777; text-align: center;">B2B ERP Platform System Notification</p>
      </div>
    `;
    return this.sendMail(to, subject, text, html);
  }
}
