import net from 'node:net';
import tls from 'node:tls';
import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

const smtpConfigured = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
const resendConfigured = () => Boolean(env.RESEND_API_KEY);

const readResponse = (socket: net.Socket) =>
  new Promise<string>((resolve, reject) => {
    let buffer = '';
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('timeout', onTimeout);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onTimeout = () => {
      cleanup();
      reject(new Error(`SMTP response timed out after ${env.SMTP_TIMEOUT_MS}ms`));
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const last = buffer.trimEnd().split(/\r?\n/).at(-1);
      if (last && /^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };
    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('timeout', onTimeout);
  });

const sendCommand = async (socket: net.Socket, command: string, expected: number[]) => {
  socket.write(`${command}\r\n`);
  const response = await readResponse(socket);
  const code = Number(response.slice(0, 3));
  if (!expected.includes(code)) throw new Error(`SMTP command failed with ${code}`);
};

const connect = () =>
  new Promise<net.Socket>((resolve, reject) => {
    if (!env.SMTP_HOST) return reject(new Error('SMTP host is missing'));
    let settled = false;
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const resolveOnce = (socket: net.Socket) => {
      if (settled) return;
      settled = true;
      resolve(socket);
    };
    const socket = env.SMTP_SECURE
      ? tls.connect({ host: env.SMTP_HOST, port: env.SMTP_PORT, servername: env.SMTP_HOST, timeout: env.SMTP_TIMEOUT_MS })
      : net.connect({ host: env.SMTP_HOST, port: env.SMTP_PORT });
    socket.setTimeout(env.SMTP_TIMEOUT_MS);
    socket.once('error', rejectOnce);
    socket.once('timeout', () => {
      socket.destroy();
      rejectOnce(new Error(`SMTP connection timed out after ${env.SMTP_TIMEOUT_MS}ms`));
    });
    socket.once(env.SMTP_SECURE ? 'secureConnect' : 'connect', async () => {
      try {
        await readResponse(socket);
        resolveOnce(socket);
      } catch (error) {
        rejectOnce(error instanceof Error ? error : new Error('SMTP connection failed'));
      }
    });
  });

const upgradeToTls = (socket: net.Socket) =>
  new Promise<tls.TLSSocket>((resolve, reject) => {
    if (!env.SMTP_HOST) return reject(new Error('SMTP host is missing'));
    let settled = false;
    const rejectOnce = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const resolveOnce = (tlsSocket: tls.TLSSocket) => {
      if (settled) return;
      settled = true;
      resolve(tlsSocket);
    };
    const tlsSocket = tls.connect({ socket, servername: env.SMTP_HOST, timeout: env.SMTP_TIMEOUT_MS });
    tlsSocket.setTimeout(env.SMTP_TIMEOUT_MS);
    tlsSocket.once('error', rejectOnce);
    tlsSocket.once('timeout', () => {
      tlsSocket.destroy();
      rejectOnce(new Error(`SMTP STARTTLS handshake timed out after ${env.SMTP_TIMEOUT_MS}ms`));
    });
    tlsSocket.once('secureConnect', () => resolveOnce(tlsSocket));
  });

const sendWithResend = async (input: { to: string; subject: string; html: string; text: string }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Resend API failed with ${response.status}: ${details.slice(0, 500)}`);
  }
};

export async function sendOtpEmail(input: { to: string; otp: string; purpose: 'verify_email' | 'reset_password' }) {
  const label = input.purpose === 'verify_email' ? 'Email verification' : 'Password reset';
  const subject = `SK Auth · ${label} code`;
  const action = input.purpose === 'verify_email' ? 'Verify your SK Auth identity' : 'Reset your SK Auth password';
  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a"><div style="padding:32px 16px"><div style="max-width:560px;margin:auto;overflow:hidden;border-radius:28px;background:#ffffff;box-shadow:0 24px 70px rgba(15,23,42,.14)"><div style="padding:28px;background:linear-gradient(135deg,#020617,#0f172a);color:white"><div style="display:inline-block;padding:10px 13px;border-radius:14px;background:linear-gradient(135deg,#67e8f9,#fde68a,#fda4af);font-weight:900;color:#020617">SK</div><span style="margin-left:10px;font-weight:900;font-size:18px">SK Auth</span><h1 style="margin:28px 0 8px;font-size:28px">${action}</h1><p style="margin:0;color:#cbd5e1;line-height:1.6">One secure identity across the SK ecosystem.</p></div><div style="padding:30px"><p style="margin-top:0;color:#475569;line-height:1.7">Use this one-time code to continue. It is personal to you and should never be shared.</p><div style="margin:24px 0;padding:22px;border:1px solid #a5f3fc;border-radius:20px;background:#ecfeff;text-align:center"><span style="display:block;font-size:12px;font-weight:800;letter-spacing:2px;color:#0e7490">YOUR SECURE CODE</span><strong style="display:block;margin-top:8px;font-size:38px;letter-spacing:10px;color:#020617">${input.otp}</strong></div><p style="font-size:14px;color:#64748b">This code expires in <strong>${env.OTP_TTL_MINUTES} minutes</strong>. If you did not request it, you can safely ignore this email.</p><div style="margin-top:26px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">Protected by SK Auth · Secure by design · Made for your SK identity</div></div></div></div></body></html>`;
  const text = `Your SK Central OTP is ${input.otp}. This code expires in ${env.OTP_TTL_MINUTES} minutes.`;

  if (resendConfigured()) {
    try {
      await sendWithResend({ to: input.to, subject, html, text });
      return;
    } catch (error) {
      logger.error('OTP email delivery failed via Resend API', error);
      const deliveryError = new Error('Email delivery failed via Resend. Check RESEND_API_KEY, verified sender domain, and Resend account status.') as Error & {
        statusCode?: number;
      };
      deliveryError.statusCode = 502;
      throw deliveryError;
    }
  }

  if (!smtpConfigured()) {
    console.info(`[SK Central] ${label} OTP for ${input.to}: ${input.otp}`);
    return;
  }

  let socket: net.Socket | null = null;
  const fromAddress = env.SMTP_USER ?? '';
  const from = env.MAIL_FROM || fromAddress;
  const boundary = `sk-central-${Date.now()}`;
  const message = [
    `From: ${from}`,
    `To: ${input.to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    text,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
    '',
    `--${boundary}--`
  ].join('\r\n');

  try {
    socket = await connect();
    await sendCommand(socket, 'EHLO sk-central.local', [250]);
    if (!env.SMTP_SECURE && env.SMTP_STARTTLS) {
      await sendCommand(socket, 'STARTTLS', [220]);
      socket = await upgradeToTls(socket);
      await sendCommand(socket, 'EHLO sk-central.local', [250]);
    }
    await sendCommand(socket, 'AUTH LOGIN', [334]);
    await sendCommand(socket, Buffer.from(fromAddress).toString('base64'), [334]);
    await sendCommand(socket, Buffer.from(env.SMTP_PASS ?? '').toString('base64'), [235]);
    await sendCommand(socket, `MAIL FROM:<${fromAddress}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${input.to}>`, [250, 251]);
    await sendCommand(socket, 'DATA', [354]);
    await sendCommand(socket, `${message.replace(/^\./gm, '..')}\r\n.`, [250]);
    await sendCommand(socket, 'QUIT', [221]);
  } catch (error) {
    logger.error(
      `OTP email delivery failed via ${env.SMTP_HOST}:${env.SMTP_PORT} secure=${env.SMTP_SECURE} starttls=${env.SMTP_STARTTLS}`,
      error
    );
    const deliveryError = new Error(
      `Email delivery failed via SMTP ${env.SMTP_HOST}:${env.SMTP_PORT}. Check SMTP host, port, Render outbound access, provider SMTP access, credentials, or use a transactional email provider.`
    ) as Error & { statusCode?: number };
    deliveryError.statusCode = 502;
    throw deliveryError;
  } finally {
    socket?.end();
    socket?.destroy();
  }
}
