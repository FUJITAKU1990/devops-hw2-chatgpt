import nodemailer, { Transporter } from 'nodemailer';
import {
    ActivationEmailData,
    activationEmailHtml,
    activationEmailText,
    OrderConfirmationData,
    orderConfirmationHtml,
    orderConfirmationText,
    PaymentReceiptData,
    paymentReceiptHtml,
    paymentReceiptText,
    CancellationData,
    cancellationHtml,
    cancellationText,
} from './templates';

export type {
    ActivationEmailData,
    OrderConfirmationData,
    PaymentReceiptData,
    CancellationData,
};

console.log(`[MAIL] Module loaded — SMTP_HOST=${process.env.SMTP_HOST} SMTP_PORT=${process.env.SMTP_PORT}`);

let transporter: Transporter | null = null;
let transporterHost: string | null = null;

function getTransporter(): Transporter {
    const currentHost = process.env.SMTP_HOST || 'localhost';
    const currentPort = parseInt(process.env.SMTP_PORT || '1025', 10);

    if (transporter && transporterHost === currentHost) {
        console.log(`[MAIL] Reusing transporter host=${transporterHost}:${currentPort}`);
        return transporter;
    }

    if (transporter && transporterHost !== currentHost) {
        console.warn(`[MAIL] SMTP_HOST changed (${transporterHost} → ${currentHost}), recreating transporter`);
    } else {
        console.log(`[MAIL] Creating transporter host=${currentHost}:${currentPort}`);
    }

    transporter = nodemailer.createTransport({
        host: currentHost,
        port: currentPort,
        secure: false,
        tls: { rejectUnauthorized: false },
    });
    transporterHost = currentHost;
    return transporter;
}

function getFrom(): string {
    return process.env.SMTP_FROM || 'noreply@tartantickets.cmu.edu';
}

async function safeSend(mailOptions: nodemailer.SendMailOptions): Promise<boolean> {
    console.log(`[MAIL] Attempting send to=${mailOptions.to} subject="${mailOptions.subject}" SMTP_HOST=${process.env.SMTP_HOST} SMTP_PORT=${process.env.SMTP_PORT}`);
    try {
        const info = await getTransporter().sendMail(mailOptions);
        console.log(`[MAIL] Sent to=${mailOptions.to} subject="${mailOptions.subject}" id=${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`[MAIL] Failed to send to=${mailOptions.to} host=${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`, err);
        return false;
    }
}

export async function sendActivationEmail(to: string, data: ActivationEmailData): Promise<boolean> {
    return safeSend({
        from: getFrom(),
        to,
        subject: 'Activate your Tartan Tickets account',
        text: activationEmailText(data),
        html: activationEmailHtml(data),
    });
}

export async function sendOrderConfirmationEmail(to: string, data: OrderConfirmationData): Promise<boolean> {
    return safeSend({
        from: getFrom(),
        to,
        subject: `Order Confirmed — ${data.recordLocator}`,
        text: orderConfirmationText(data),
        html: orderConfirmationHtml(data),
    });
}

export async function sendPaymentReceiptEmail(to: string, data: PaymentReceiptData): Promise<boolean> {
    return safeSend({
        from: getFrom(),
        to,
        subject: `Payment Receipt — ${data.recordLocator}`,
        text: paymentReceiptText(data),
        html: paymentReceiptHtml(data),
    });
}

export async function sendCancellationEmail(to: string, data: CancellationData): Promise<boolean> {
    return safeSend({
        from: getFrom(),
        to,
        subject: `Order Cancelled — ${data.recordLocator}`,
        text: cancellationText(data),
        html: cancellationHtml(data),
    });
}

export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
    return safeSend({
        from: getFrom(),
        to,
        subject,
        text: body,
    });
}
