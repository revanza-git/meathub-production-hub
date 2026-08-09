# SBMEAT Meat Hub MVP

Build the SBMEAT Meat Hub production MVP using the attached documents:

1. SBMEAT_Production_MVP_PRD.md

   - Primary source of truth for product scope, user journeys,

     business rules, functional requirements, and acceptance criteria.

2. SBMEAT_Production_MVP_FSD.md

   - Primary source of truth for architecture, database schema,

     API contracts, security, integrations, background jobs,

     testing, deployment, and implementation standards.

and there are other two .html mockup and pdf concept pdf for reference.

Authority rules:

- For product behaviour and business decisions, PRD takes precedence.

- For technical implementation, FSD takes precedence.

- Do not invent features outside the MVP scope.

- Do not simplify or remove business rules without asking.

- When a requirement is marked as an assumption or founder decision,

  stop and ask before implementing it.

- Implement the system incrementally, not all at once.

- Start by analysing both documents and produce:

  1. implementation plan,

  2. route and screen map,

  3. database schema,

  4. development phases,

  5. unresolved decisions.

- Do not write production code until I approve the plan.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://meathub-production-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/19bca304-e80b-423f-bf8e-51232c3bb4a2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
