# Privacy

Forest Agent Dashboard is local-first and contains no telemetry, analytics, advertising, or hosted account system.

## Data kept locally

Normal plugin data may include:

- tasks;
- frequent-note open counters and note paths;
- mailbox addresses and HTTPS inbox links;
- a Google OAuth client ID;
- connection markers that indicate a credential exists in secure storage;
- cached public GitHub repository metadata;
- the optional vault-relative mascot path.

The plugin builds its note search index in memory. It does not upload note titles, paths, tags, or contents.

## Credentials

GitHub tokens, Gmail OAuth tokens, optional Google desktop client secrets, and QQ Mail authorization codes use Obsidian secure storage when available. The desktop implementation retains a macOS Keychain fallback for compatibility. Credentials are never intentionally logged or included in repository fixtures.

Google desktop OAuth client IDs are not secrets and remain in normal plugin settings. Installed desktop applications cannot keep a distributed client secret confidential.

## Optional network requests

| Feature | Destination | Data sent | Data received |
| --- | --- | --- | --- |
| Gmail | `accounts.google.com`, `oauth2.googleapis.com`, `gmail.googleapis.com` | OAuth parameters/token; Gmail API request | Profile address, message IDs, labels, sender/subject/date metadata, snippet |
| QQ Mail | `imap.qq.com:993` over TLS | Mail address and IMAP authorization code | Inbox flags and selected message headers |
| GitHub radar | `github.com`, `api.github.com` | Fixed public search queries; optional token | Public repository metadata |
| Technology news | `hacker-news.firebaseio.com` | Public story IDs | Public story metadata |

No network request includes vault note content.

## Mail behavior

Mailroom is read-only. It does not mark mail as read, archive, delete, send, or modify messages. Message headers and snippets are held in memory for the current Obsidian session and are not saved to the vault by the plugin.

Selecting a message opens the provider's web inbox. Compose opens the provider's web compose page; the plugin itself does not send mail.

## Removing local data

- Remove individual credentials from plugin settings.
- Clear frequent-note history and GitHub cache from plugin settings.
- Disable and delete the plugin to remove its normal plugin data.
- If legacy macOS Keychain entries remain, remove entries under `Obsidian Forest Agent Dashboard` using Keychain Access.

