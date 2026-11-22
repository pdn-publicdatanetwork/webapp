// Types dp-firebase-admin/auth - surface DataParl' : getAuth, verifyIdToken
// (toujours checkRevoked=false), generateSignInWithEmailLink.

export interface DecodedIdToken {
  email?: string;
  [champ: string]: unknown;
}

export interface ActionCodeSettings {
  url: string;
  handleCodeInApp?: boolean;
  dynamicLinkDomain?: string;
}

export interface Auth {
  verifyIdToken(jeton: string, checkRevoked?: boolean): Promise<DecodedIdToken>;
  generateSignInWithEmailLink(email: string, settings: ActionCodeSettings): Promise<string>;
}

export declare function getAuth(app: unknown): Auth;
