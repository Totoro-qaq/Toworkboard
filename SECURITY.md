# Security policy

## Supported version

Only the latest published version receives security fixes during the preview period.

## Reporting a vulnerability

Do not post credentials or private vault data in a public issue. Use [GitHub private vulnerability reporting](https://github.com/Totoro-qaq/forest-agent-dashboard/security/advisories/new) for exploit details or sensitive evidence.

Include the plugin version, Obsidian version, operating system, affected integration, and a sanitized reproduction. Replace addresses, tokens, message subjects, paths, and screenshots with synthetic values.

## Security model

- Core vault features are local.
- External services are optional and user configured.
- Mail access is metadata-only and read-only.
- Credentials use Obsidian secure storage with a macOS Keychain fallback.
- External URLs are restricted to HTTPS, except the QQ TLS IMAP socket.
- Repository verification rejects common token formats, personal addresses, plugin data, and known private identifiers.

## User responsibilities

- Use the narrowest available scope.
- Use a dedicated GitHub fine-grained token if authentication is needed.
- Never use a QQ account password; use an authorization code.
- Keep Obsidian and the plugin updated.
- Review source and release checksums before installing unpublished builds.
