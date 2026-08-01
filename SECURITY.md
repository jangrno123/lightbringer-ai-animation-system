# Security policy

## Public repository scope

This repository contains public documentation, reference architecture, and a clean-room dummy application. The commercial production application, client projects, production media, credentials, and infrastructure configuration remain private.

The demo keeps provider keys on the server. Do not modify it to accept or persist API keys in browser storage. External API calls must remain explicitly disabled by default.

## Do not report publicly

Do not open a public issue containing:

- API keys, session tokens, cookies, or passwords;
- private service or admin URLs;
- personal email addresses or audit records;
- unreleased screenplay or media files;
- a method to bypass authentication or authorization.

## Reporting

Report suspected security issues privately through STUDIO GENESIS's official contact channel at [studiogenesis.co.kr](https://www.studiogenesis.co.kr).

Include:

- affected component;
- reproduction steps;
- expected and observed behavior;
- potential impact;
- whether any sensitive data was accessed.

Please allow the maintainers time to validate and address the issue before public disclosure.
