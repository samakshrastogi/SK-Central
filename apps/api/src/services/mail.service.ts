import net from 'node:net';
import tls from 'node:tls';
import { env } from '@/config/env.js';

const configured = () => Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const readResponse = (socket: net.Socket) =>
  new Promise<string>((resolve, reject) => {
    let buffer = '';
    const onError = (error: Error) => reject(error);
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const last = buffer.trimEnd().split(/\r?\n/).at(-1);
      if (last && /^\d{3} /.test(last)) {
        socket.off('data', onData);
        socket.off('error', onError);
        resolve(buffer);
      }
    };
    socket.on('data', onData);
    socket.on('error', onError);
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
    const socket = env.SMTP_SECURE
      ? tls.connect({ host: env.SMTP_HOST, port: env.SMTP_PORT, servername: env.SMTP_HOST })
      : net.connect({ host: env.SMTP_HOST, port: env.SMTP_PORT });
    socket.once('error', reject);
    socket.once(env.SMTP_SECURE ? 'secureConnect' : 'connect', async () => {
      try {
        await readResponse(socket);
        resolve(socket);
      } catch (error) {
        reject(error);
      }
    });
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

  const socket = await connect();
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

  await sendCommand(socket, 'EHLO sk-central.local', [250]);
  await sendCommand(socket, 'AUTH LOGIN', [334]);
  await sendCommand(socket, Buffer.from(fromAddress).toString('base64'), [334]);
  await sendCommand(socket, Buffer.from(env.SMTP_PASS ?? '').toString('base64'), [235]);
  await sendCommand(socket, `MAIL FROM:<${fromAddress}>`, [250]);
  await sendCommand(socket, `RCPT TO:<${input.to}>`, [250, 251]);
  await sendCommand(socket, 'DATA', [354]);
  await sendCommand(socket, `${message.replace(/^\./gm, '..')}\r\n.`, [250]);
  await sendCommand(socket, 'QUIT', [221]);
  socket.end();
}
