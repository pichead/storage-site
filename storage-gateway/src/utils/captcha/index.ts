import * as nodemailer from 'nodemailer';

import { env } from '../constant';
import logger from '../logger';

const googleCaptChaValidate = async (key: string): Promise<boolean> => {
  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.captcha.google.googleCaptchaV3Secret);
    formData.append('response', key);

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    logger.error('google reCaptcha validation error:', error);
    return false;
  }
}

const cloudflareTurnstileValidate = async (key: string): Promise<boolean> => {
  try {
    const formData = new URLSearchParams();
    formData.append('secret', env.captcha.cloudflare.turnstileSecret);
    formData.append('response', key);

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    logger.error('Turnstile validation error:', error);
    return false;
  }
};

export const CAPTCHA = {
  cloudflare: {
    validate: cloudflareTurnstileValidate,
  },
  google: {
    validate: googleCaptChaValidate
  }
};
