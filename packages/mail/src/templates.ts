const BRAND_COLOR = '#c41230';
const BG_COLOR = '#f4f4f4';

function layout(title: string, body: string): string {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:${BG_COLOR};padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:${BRAND_COLOR};padding:24px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:22px;">Tartan Tickets</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    ${body}
  </td></tr>
  <tr><td style="padding:16px 32px;background:#fafafa;color:#888;font-size:12px;text-align:center;">
    Carnegie Mellon University &bull; Pittsburgh, PA 15213<br>
    This is an automated message from Tartan Tickets.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function dollars(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

export interface ActivationEmailData {
    name: string;
    activationUrl: string;
}

export function activationEmailHtml(data: ActivationEmailData): string {
    return layout('Activate your Tartan Tickets account', `
    <h2 style="margin:0 0 16px;color:#333;">Welcome, ${data.name}!</h2>
    <p style="color:#555;line-height:1.6;">
      Your Tartan Tickets account has been created. Please confirm your email
      address to activate your account before signing in.
    </p>
    <p style="margin-top:24px;">
      <a href="${data.activationUrl}" style="display:inline-block;background:${BRAND_COLOR};color:#fff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;">Activate Account</a>
    </p>
    <p style="color:#777;line-height:1.6;font-size:13px;">
      If the button does not work, copy and paste this link into your browser:<br>
      <a href="${data.activationUrl}" style="color:${BRAND_COLOR};word-break:break-all;">${data.activationUrl}</a>
    </p>
  `);
}

export function activationEmailText(data: ActivationEmailData): string {
    return `Welcome to Tartan Tickets, ${data.name}!\n\nYour account has been created. Activate your account before signing in by visiting this link:\n${data.activationUrl}`;
}

export interface OrderConfirmationData {
    name: string;
    recordLocator: string;
    eventName: string;
    eventDate: string;
    eventLocation: string;
    ticketCount: number;
    seatNumbers: string[];
    totalAmountCents: number;
}

export function orderConfirmationHtml(data: OrderConfirmationData): string {
    const seatsRow = data.seatNumbers.length > 0
        ? `<tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Seats</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${data.seatNumbers.join(', ')}</td></tr>`
        : '';

    return layout('Order Confirmation', `
    <h2 style="margin:0 0 8px;color:#333;">Order Confirmed</h2>
    <p style="color:#555;line-height:1.6;">Hi ${data.name}, your order has been confirmed.</p>

    <div style="background:#f9f9f9;border-radius:6px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:13px;color:#888;">Record Locator</p>
      <p style="margin:0;font-size:24px;font-weight:bold;color:${BRAND_COLOR};letter-spacing:2px;">${data.recordLocator}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Event</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${data.eventName}</td></tr>
      <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Date</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${data.eventDate}</td></tr>
      <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Location</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${data.eventLocation}</td></tr>
      <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Tickets</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${data.ticketCount}</td></tr>
      ${seatsRow}
      <tr><td style="padding:8px 0;color:#555;font-weight:bold;">Total</td><td style="padding:8px 0;color:#333;font-weight:bold;text-align:right;">${dollars(data.totalAmountCents)}</td></tr>
    </table>

    <p style="color:#555;font-size:13px;line-height:1.5;">
      Please save your record locator. You will need it to manage your booking.
    </p>
  `);
}

export function orderConfirmationText(data: OrderConfirmationData): string {
    const seats = data.seatNumbers.length > 0 ? `\nSeats: ${data.seatNumbers.join(', ')}` : '';
    return `Order Confirmed\n\nHi ${data.name},\n\nRecord Locator: ${data.recordLocator}\nEvent: ${data.eventName}\nDate: ${data.eventDate}\nLocation: ${data.eventLocation}\nTickets: ${data.ticketCount}${seats}\nTotal: ${dollars(data.totalAmountCents)}\n\nPlease save your record locator. You will need it to manage your booking.`;
}

export interface PaymentReceiptData {
    name: string;
    recordLocator: string;
    transactionId: string;
    amountCents: number;
    cardBrand?: string;
    cardLast4?: string;
    eventName: string;
}

export function paymentReceiptHtml(data: PaymentReceiptData): string {
    const card = data.cardBrand && data.cardLast4
        ? `${data.cardBrand} ending in ${data.cardLast4}`
        : 'N/A';

    return layout('Payment Receipt', `
    <h2 style="margin:0 0 8px;color:#333;">Payment Receipt</h2>
    <p style="color:#555;line-height:1.6;">Hi ${data.name}, here is your payment receipt for order ${data.recordLocator}.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Transaction ID</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-size:12px;">${data.transactionId}</td></tr>
      <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Event</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${data.eventName}</td></tr>
      <tr><td style="padding:8px 0;color:#555;border-bottom:1px solid #eee;">Payment Method</td><td style="padding:8px 0;color:#333;border-bottom:1px solid #eee;text-align:right;">${card}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-weight:bold;">Amount Charged</td><td style="padding:8px 0;color:#333;font-weight:bold;text-align:right;">${dollars(data.amountCents)}</td></tr>
    </table>
  `);
}

export function paymentReceiptText(data: PaymentReceiptData): string {
    const card = data.cardBrand && data.cardLast4
        ? `${data.cardBrand} ending in ${data.cardLast4}`
        : 'N/A';
    return `Payment Receipt\n\nHi ${data.name},\n\nTransaction ID: ${data.transactionId}\nOrder: ${data.recordLocator}\nEvent: ${data.eventName}\nPayment Method: ${card}\nAmount Charged: ${dollars(data.amountCents)}`;
}

export interface CancellationData {
    name: string;
    recordLocator: string;
    eventName: string;
    refundAmountCents: number;
    reason: string;
}

export function cancellationHtml(data: CancellationData): string {
    return layout('Order Cancelled', `
    <h2 style="margin:0 0 8px;color:#333;">Order Cancelled</h2>
    <p style="color:#555;line-height:1.6;">Hi ${data.name}, your order <strong>${data.recordLocator}</strong> for <strong>${data.eventName}</strong> has been cancelled.</p>

    <div style="background:#f9f9f9;border-radius:6px;padding:16px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;color:#555;">Reason</td><td style="padding:4px 0;color:#333;text-align:right;">${data.reason}</td></tr>
        <tr><td style="padding:4px 0;color:#555;font-weight:bold;">Refund Amount</td><td style="padding:4px 0;color:#333;font-weight:bold;text-align:right;">${dollars(data.refundAmountCents)}</td></tr>
      </table>
    </div>

    <p style="color:#555;font-size:13px;line-height:1.5;">
      If you paid by card, the refund will appear on your statement within 5&ndash;7 business days.
    </p>
  `);
}

export function cancellationText(data: CancellationData): string {
    return `Order Cancelled\n\nHi ${data.name},\n\nYour order ${data.recordLocator} for ${data.eventName} has been cancelled.\nReason: ${data.reason}\nRefund Amount: ${dollars(data.refundAmountCents)}\n\nIf you paid by card, the refund will appear on your statement within 5-7 business days.`;
}
