import net from 'node:net';
import tls from 'node:tls';
import { env } from '@/config/env.js';
import { logger } from '@/utils/logger.js';

const configured = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

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

export async function sendOtpEmail(input: { to: string; otp: string; purpose: 'verify_email' | 'reset_password' }) {
  const label = input.purpose === 'verify_email' ? 'Email verification' : 'Password reset';
  const subject = `SK Central ${label} OTP`;
  const html = `<p>Your SK Central OTP is:</p><h1>${input.otp}</h1><p>This code expires in ${env.OTP_TTL_MINUTES} minutes.</p>`;
  const text = `Your SK Central OTP is ${input.otp}. This code expires in ${env.OTP_TTL_MINUTES} minutes.`;

  if (!configured()) {
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
