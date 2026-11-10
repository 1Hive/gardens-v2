"use client";

import { signIn, signOut } from "next-auth/react";

export function AuthButton({ signedIn }) {
  return signedIn
    ? <button type="button" className="button-secondary" onClick={() => signOut()}>Sign out</button>
    : <button type="button" onClick={() => signIn("github")}>Continue with GitHub</button>;
}
