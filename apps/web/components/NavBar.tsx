import React from "react";

export function NavBar() {
  return (
    <nav className="flex justify-center p-4 gap-2">
      <div className="flex-1 bg-primary rounded-lg"></div>
      <div>
        <w3m-button balance="hide" label="Connect Wallet" />
      </div>
    </nav>
  );
}
