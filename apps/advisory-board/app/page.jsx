import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import { AuthButton } from "./auth-button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return <main className="signin-shell">
      <div className="signin-panel">
        <p className="repository">1Hive / gardens-v2</p>
        <h1>Security advisories</h1>
        <p>Sign in with an account authorized to access Gardens security advisories.</p>
        <AuthButton signedIn={false} />
      </div>
    </main>;
  }

  return <main className="workspace">
    <header className="topbar">
      <div><p className="repository">1Hive / gardens-v2</p><h1>Security advisories</h1></div>
      <div className="sync-controls">
        <span id="synced-at" className="sync-time" aria-live="polite">Connecting to GitHub</span>
        <button id="refresh" type="button">Refresh</button>
        <AuthButton signedIn />
      </div>
    </header>
    <div className="toolbar">
      <label className="search-field"><span className="visually-hidden">Search advisories</span>
        <input id="search" type="search" placeholder="Search title, ID, or reporter" autoComplete="off" />
      </label>
      <label className="select-field"><span>Severity</span><select id="severity" defaultValue="all">
        <option value="all">All severities</option><option value="critical">Critical</option>
        <option value="high">High</option><option value="medium">Medium</option>
        <option value="low">Low</option><option value="unknown">Unspecified</option>
      </select></label>
      <label className="select-field"><span>Tag</span><select id="tag" defaultValue="all">
        <option value="all">All tags</option><option value="replied">Replied</option>
        <option value="proposal">Proposal</option><option value="fixed">Fixed</option>
        <option value="github-draft">GitHub draft</option>
      </select></label>
      <label className="select-field"><span>Order</span><select id="order" defaultValue="newest">
        <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
        <option value="updated">Recently updated</option>
      </select></label>
      <p id="result-count" className="result-count" aria-live="polite" />
    </div>
    <p id="error" className="error-message" role="alert" hidden />
    <p id="notice" className="notice-message" role="status" hidden />
    <section id="board" className="board" aria-label="Advisories by workflow stage" />
    <dialog id="transition-dialog" aria-labelledby="dialog-title">
      <h2 id="dialog-title" /><p id="dialog-description" />
      <label id="transition-input-wrap" hidden><span id="transition-input-label" />
        <input id="transition-input" type="text" autoComplete="off" spellCheck="false" />
      </label>
      <div className="dialog-actions">
        <button id="cancel-transition" type="button" className="button-secondary">Cancel</button>
        <button id="confirm-transition" type="button" />
      </div>
    </dialog>
    <script type="module" src="/app.js" />
  </main>;
}
