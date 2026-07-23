export type MailTemplateId =
  | "email_verification"
  | "password_reset"
  | "seller_verification_submitted"
  | "seller_verification_approved"
  | "seller_verification_rejected";

export type MailPayload = {
  email_verification: {
    name: string;
    verifyUrl: string;
    expiresHours: number;
  };
  password_reset: {
    name: string;
    resetUrl: string;
    expiresHours: number;
  };
  seller_verification_submitted: {
    name: string;
  };
  seller_verification_approved: {
    name: string;
    postListingUrl: string;
  };
  seller_verification_rejected: {
    name: string;
    reason: string;
    resubmitUrl: string;
  };
};

export type RenderedMail = {
  subject: string;
  html: string;
  text: string;
};
