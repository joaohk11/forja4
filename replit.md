# FORJA — Sistema de Gestão de Treino de Voleibol

## Overview
FORJA is a volleyball coaching and athlete performance management application built with React + Vite + TypeScript. It features a dark sporty design with neon-blue highlights.

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite (port 5000)
- **Backend**: Express server (port 3000) — serves AI coach API
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Context + localStorage persistence (Supabase-ready)
- **Routing**: React Router v6
- **AI**: Google Gemini 2.5 Flash via Express server route `/api/ai-coach`
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Supabase**: Client configured at `src/lib/supabaseClient.ts` (requires env vars)

### Key Files
- `src/lib/types.ts` — All TypeScript types, data models and helper functions
- `src/lib/context.tsx` — Global state management (AppProvider + useApp hook)
- `src/lib/store.ts` — localStorage persistence layer
- `src/lib/ai.ts` — AI streaming helper (calls `/api/ai-coach`)
- `src/lib/supabaseClient.ts` — Supabase client (auto-disabled if env vars missing)
- `src/App.tsx` — Routing configuration
- `src/components/AppLayout.tsx` — Main layout wrapper (TopBar + Sidebar)
- `server/index.ts` — Express server: AI coach (Gemini) + Supabase backup proxy

### Services (Supabase CRUD, src/services/)
- `athletesService.ts` — CRUD + realtime subscription for athletes
- `trainingService.ts` — CRUD + realtime subscription for trainings
- `lineupService.ts` — Lineup + lineup_players CRUD
- `accessService.ts` — Token-based access links (generate/validate/revoke)

### Data Storage
All data is stored in `localStorage` under the key `forja_data` as an `AppData` object.
When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set, Supabase services become active.

## Features

### Athletes
- Athlete list with add/edit/delete
- **Athletes by Position page** (`/atletas-por-posicao`): sections per position (levantador, ponteiro, central, oposto, líbero), mini card with radar chart (ataque, bloqueio, passe, defesa, levantamento)
- **Físico score**: auto-calculated from physical attributes (força, explosão, velocidade, agilidade, resistência, reflexo) — shown ONLY on by-position cards
- **Athlete comparison**: select 2+ athletes from the same position, side-by-side stat comparison with top performer highlighted
- Levantador special rule: ataque replaced by levantamento in their skill display

### Evaluation System
- Physical attributes: força, explosão, agilidade, velocidade, resistência, reflexo
- Technical attributes: bloqueio, saque, ataque, defesa, recepção, cobertura, leitura_de_jogo, levantamento
- Tests with configurable max value and rule (maior/menor melhor)
- Batch evaluation (all athletes at once)
- Athlete ranking per attribute

### Tactical System
Full tactical analysis with position-based scoring:
- **Ponteiro**: fundo (passe + defesa), rede (ataque + bloqueio)
- **Central**: fundo (passe 0.7x), rede (ataque + bloqueio 1.2x)
- **Líbero**: fundo only (passe 1.5x + defesa 1.5x)
- **Oposto**: fundo (defesa only), rede (ataque 1.1x + bloqueio)
- **Levantador**: fundo (defesa only), rede (levantamento×0.7 → ataque + bloqueio)
- Pass rule: only ponteiros + líbero count for passe
- Rotation score, strengths/weaknesses, team analysis
- Libero substitution configuration

### Training
- Create training with named blocks (fundamentos, habilidades)
- AI-powered module generation (Gemini)
- Training instruction textarea (enlarged, resizable)
- Quick training generator
- Module templates (save/reuse)
- Module status tracking

### Periodization
- Macrocycle → Mesocycle → Microcycle hierarchy

### AI Coach
- Chat with FORJA AI (Gemini 2.5 Flash)
- Generate trainings, analyze athletes

### Auxiliary Coach
- Standalone route: `/auxiliar/:teamId`
- View trainings, mark module status, propose changes, AI analysis

### Supabase Integration (ready, needs credentials)
- SQL schema: `supabase/schema.sql`
- Tables: teams, athletes, athlete_attributes, eval_tests, eval_results, trainings, training_modules, training_execution, lineups, lineup_players, access_links, macrocycles, mesocycles, microcycles
- Realtime-ready for athletes, trainings, training_execution

## Routes
| Path | Component | Description |
|------|-----------|-------------|
| `/` | Index | Dashboard |
| `/calendario` | CalendarPage | Training calendar |
| `/atletas` | AthletesPage | Athlete list |
| `/atletas-por-posicao` | AthletesByPositionPage | Athletes grouped by position + comparison |
| `/criar-treino` | CreateTrainingPage | Create training |
| `/treino/:id` | TrainingDetailPage | Training detail + module status |
| `/treino-hoje` | TodayTrainingPage | Today's training |
| `/proximo-treino` | NextTrainingPage | Next training |
| `/periodizacao` | PeriodizationPage | Season planning |
| `/historico` | HistoryPage | Training history |
| `/backup` | BackupPage | Data backup/restore |
| `/criar-ciclo` | CreateCyclePage | Create macrocycle |
| `/time/:id` | TeamProfilePage | Team profile |
| `/avaliacoes` | EvaluationsPage | Evaluation management |
| `/atleta/:id` | AthleteProfilePage | Athlete profile |
| `/sistema-tatico` | TacticalSystemPage | Tactical system |
| `/ia-treinador` | AICoachPage | AI Coach |
| `/sugestoes` | SuggestionsPage | Training suggestions from auxiliary |
| `/auxiliar/:teamId` | AuxiliaryPage | Auxiliary coach interface (standalone) |

## Development
```bash
npm run dev     # Start both Express (port 3000) + Vite (port 5000) concurrently
```

## Environment Variables
- `GEMINI_API_KEY` — Google Gemini API key (required for AI coach)
- `VITE_SUPABASE_URL` — Supabase project URL (optional, enables cloud sync)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (optional, enables cloud sync)
