# Tech Stack & Library Usage Rules

## Tech Stack (bullet points)
- React 18 with TypeScript
- React Router v6 (routes kept in `src/App.tsx`)
- Vite as the build tool
- Bun as the package manager
- Tailwind CSS for styling (utility‑first approach)
- shadcn/ui component library (pre‑built, accessible UI primitives)
- Lucide React for icons
- Radix UI primitives (used via shadcn/ui)
- Supabase for backend services (auth, database, storage)
- ESLint for code linting
- Vitest for testing

## Library Usage Rules
- **Source code location**: All source files must reside in the `src/` directory.
- **Pages**: Place page components in `src/pages/` (the main/default page is `src/pages/Index.tsx`).
- **Components**: Place reusable, non‑page components in `src/components/`.
- **UI components**: Favor shadcn/ui components found in `src/components/ui/`. Do **not** edit these files directly; if customization is needed, create a new wrapper component that extends or composes the shadcn/ui component.
- **Styling**: Use Tailwind CSS classes for layout, spacing, colors, typography, and responsive design. Avoid writing custom CSS unless absolutely necessary; if needed, add to `src/styles.css` or a component‑specific Tailwind‑based style block.
- **Icons**: Import icons exclusively from `lucide-react` (e.g., `import { LucideIcon } from 'lucide-react';`).
- **Routing**: Keep all route definitions in `src/App.tsx` (or a dedicated router file if already present, but do not scatter route logic elsewhere). Use `<Outlet>` for nested layouts.
- **State management**: Prefer React hooks (`useState`, `useEffect`, `useContext`). For global state, consider lightweight solutions like Zustand or Jotai only when hooks become insufficient.
- **Data fetching**: Use the Supabase client (`src/integrations/supabase/client.ts`) for all server interactions. Abstract API calls into service functions in `src/lib/` or `src/integrations/`.
- **Imports**: Follow alias‑free, relative imports. Prefer barrel‑free imports for clarity.
- **Code quality**: Run `pnpm typecheck` (or `bun run typecheck`) after changes; ensure no new TypeScript errors. Keep ESLint rules passing.
- **Adding dependencies**: Install new packages via `bun add <package>` (or `pnpm add`). After installation, run type checks and verify the app still builds.
- **File naming**: Use `.tsx` for React components, `.ts` for non‑JSX logic, `.css` for Tailwind‑only stylesheets.
- **Custom components**: When a shadcn/ui component needs alteration, create a new component in `src/components/` that imports and re‑exports the shadcn/ui component with desired props or wrappers.

These rules ensure consistency, maintainability, and leverage the strengths of the chosen stack.