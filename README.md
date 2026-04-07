# Employee Management

Employee management application for Salem Foundations operations.

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Firebase (Firestore/Auth)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`.

3. Start development server:

```bash
npm run dev
```

Default URL: `http://localhost:3000`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- Keep Firebase config consistent with organizational project settings.
- Prefer API-route-based writes for sensitive operations.
- Coordinate role and permission checks with central admin policy.
