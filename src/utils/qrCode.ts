import QRCode from 'qrcode';

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 250,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#1F3A5F',
      light: '#FFFFFF',
    },
  });
}

