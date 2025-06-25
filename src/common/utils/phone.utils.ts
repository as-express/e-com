import { BadRequestException } from '@nestjs/common';

export async function extractLocalPhoneNumber(phone: string): Promise<string> {
  const allowedCharacters = phone.replace(/[^0-9+\s-]/g, '');
  if (/[^0-9\s\+\-]/.test(allowedCharacters)) {
    throw new BadRequestException(
      'phone number need be only numbers, +, -, and spaces',
    );
  }
  const digitsOnly = allowedCharacters.replace(/\D/g, '');
  if (!digitsOnly.startsWith('998') || digitsOnly.length !== 12) {
    throw new BadRequestException(
      'phone number must start with 998 and must be 12 digits long',
    );
  }

  const localPart = digitsOnly.slice(3);
  return localPart;
}
