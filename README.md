Dead End Haraka SMTP
- a fake smtp server for development
------------------------------

Dead End Haraka SMTP is a fake SMTP server built on Haraka (a node.js SMTP server) that acts like a regular SMTP server but doesn't actually send any of the emails. Instead, it keeps them locally so you can view and debug them. This is useful for developers working on a system that sends mails and prevents developers from mistakenly sending emails to real email addresses by mistake from a development machine.

Haraka is a plugin capable SMTP server. It uses a highly scalable event
model to be able to cope with thousands of concurrent connections. Plugins
are written in Javascript using Node.js, and as such perform extremely
quickly.

Haraka requires [node.js][1] to run.

[1]: http://nodejs.org/
