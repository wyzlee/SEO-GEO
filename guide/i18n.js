/* ========== WYZLEE GUIDE — i18n.js (FR/EN translations) ========== */

const translations = {
  // Sidebar
  'logo-sub': { fr: 'Guide CEO', en: 'CEO Guide' },
  'nav-overview-label': { fr: "Vue d'ensemble", en: 'Overview' },
  'nav-architecture': { fr: 'Architecture', en: 'Architecture' },
  'nav-maturity': { fr: 'Maturite Agentique', en: 'Agentic Maturity' },
  'nav-infra': { fr: 'Infrastructure', en: 'Infrastructure' },
  'nav-n8n': { fr: 'n8n (4 pipelines)', en: 'n8n (4 pipelines)' },
  'nav-pilotage-label': { fr: 'Pilotage', en: 'Operations' },
  'nav-discord': { fr: 'Discord (12 agents)', en: 'Discord (12 agents)' },
  'nav-agents': { fr: 'Agents & Modeles', en: 'Agents & Models' },
  'nav-crons': { fr: '9 Crons', en: '9 Crons' },
  'nav-claude': { fr: 'Claude Code', en: 'Claude Code' },
  'nav-data-label': { fr: 'Donnees', en: 'Data' },
  'nav-nocodb': { fr: 'NocoDB (11 tables)', en: 'NocoDB (11 tables)' },
  'nav-kb': { fr: 'Knowledge Base', en: 'Knowledge Base' },
  'nav-apps-label': { fr: 'Apps & Projets', en: 'Apps & Projects' },
  'nav-apps': { fr: '8 Apps Wyzlee', en: '8 Wyzlee Apps' },
  'nav-auth': { fr: 'Auth SSO', en: 'Auth SSO' },
  'nav-stack': { fr: 'Golden Stack', en: 'Golden Stack' },
  'nav-ops-label': { fr: 'Operations', en: 'Operations' },
  'nav-routines': { fr: 'Routines CEO', en: 'CEO Routines' },
  'nav-troubleshooting': { fr: 'Troubleshooting', en: 'Troubleshooting' },
  'nav-quickref': { fr: 'Reference rapide', en: 'Quick Reference' },
  'theme-label': { fr: 'Light mode', en: 'Light mode' },
  'theme-label-alt': { fr: 'Dark mode', en: 'Dark mode' },
  'lang-label': { fr: 'English', en: 'Francais' },
  'sidebar-footer-html': {
    fr: '<span class="status-dot"></span>12 agents actifs<br>8 apps &middot; 5 live en prod<br>11 tables NocoDB &middot; 9 crons<br>Score agentique: 9.4/10',
    en: '<span class="status-dot"></span>12 active agents<br>8 apps &middot; 5 live in prod<br>11 NocoDB tables &middot; 9 crons<br>Agentic score: 9.4/10'
  },

  // Hero
  'hero-tag': { fr: 'Workflow Agentique Autonome — Score 9.4/10', en: 'Autonomous Agentic Workflow — Score 9.4/10' },
  'hero-desc': {
    fr: "Pilotez 12 agents IA (OpenClaw) + 4 pipelines event-driven (n8n) via Discord. 8 apps SaaS, 11 tables NocoDB, webhooks Gitea, CI/CD deploy. OpenClaw fait le cerveau, n8n connecte les tuyaux, zero chevauchement — tout est trace dans le Journal IA.",
    en: "Manage 12 AI agents (OpenClaw) + 4 event-driven pipelines (n8n) via Discord. 8 SaaS apps, 11 NocoDB tables, Gitea webhooks, CI/CD deploy. OpenClaw is the brain, n8n connects the plumbing, zero overlap — everything is logged in the AI Journal."
  },
  'hero-stat-agents': { fr: 'IA specialises', en: 'specialized AI' },
  'hero-stat-apps': { fr: 'SaaS ecosystem', en: 'SaaS ecosystem' },
  'hero-stat-tables': { fr: 'NocoDB', en: 'NocoDB' },
  'hero-stat-crons': { fr: 'crons + pipelines', en: 'crons + pipelines' },
  'hero-stat-score': { fr: 'score agentique', en: 'agentic score' },

  // Section 01 — Architecture
  'ey-overview': { fr: '01 — Architecture', en: '01 — Architecture' },
  'h2-overview': { fr: "Deux cerveaux,<br>un ecosysteme", en: "Two brains,<br>one ecosystem" },
  'sub-overview': {
    fr: "Discord (OpenClaw) pilote de facon autonome 24/7. Claude Code intervient quand tu bosses. Les deux se completent sans se dupliquer.",
    en: "Discord (OpenClaw) runs autonomously 24/7. Claude Code steps in when you work. Both complement each other without overlap."
  },
  'div-5pillars': { fr: 'Les 5 piliers', en: 'The 5 pillars' },
  'card-openclaw-title': { fr: 'OpenClaw (Discord)', en: 'OpenClaw (Discord)' },
  'card-openclaw-desc': {
    fr: '12 agents IA autonomes, 9 crons, 10 bindings Discord. CEO orchestrateur, QA self-repair, event-driven Docker. <strong>Conversationnel + reasoning.</strong>',
    en: '12 autonomous AI agents, 9 crons, 10 Discord bindings. CEO orchestrator, QA self-repair, event-driven Docker. <strong>Conversational + reasoning.</strong>'
  },
  'card-n8n-title': { fr: 'n8n (Plomberie)', en: 'n8n (Plumbing)' },
  'card-n8n-desc': {
    fr: '4 pipelines event-driven. Zero cron, zero LLM. Webhooks Git, notifications NocoDB, CI/CD deploy. <strong>Reagit aux events, ne pense pas.</strong>',
    en: '4 event-driven pipelines. Zero cron, zero LLM. Git webhooks, NocoDB notifications, CI/CD deploy. <strong>Reacts to events, doesn\'t think.</strong>'
  },
  'card-nocodb-title': { fr: 'NocoDB', en: 'NocoDB' },
  'card-nocodb-desc': {
    fr: '11 tables. Taches, sprints, alertes, changelog, services, deps watch, domaines, workflows n8n, Journal IA. <strong>Source de verite projet.</strong>',
    en: '11 tables. Tasks, sprints, alerts, changelog, services, deps watch, domains, n8n workflows, AI Journal. <strong>Project source of truth.</strong>'
  },
  'card-kb-title': { fr: 'Open Notebook (KB)', en: 'Open Notebook (KB)' },
  'card-kb-desc': {
    fr: '9 sources documentaires. RAG search via Discord #ask-docs. Base de connaissances interrogeable par les agents et par toi.',
    en: '9 document sources. RAG search via Discord #ask-docs. Knowledge base searchable by agents and by you.'
  },
  'card-claude-title': { fr: 'Claude Code', en: 'Claude Code' },
  'card-claude-desc': {
    fr: 'Coding, deploys, infra, architecture. 5 commandes slash, 7 CLAUDE.md par app, memoire persistante. <strong>Interactif avec Olivier.</strong>',
    en: 'Coding, deploys, infra, architecture. 5 slash commands, 7 CLAUDE.md per app, persistent memory. <strong>Interactive with Olivier.</strong>'
  },
  'div-4layers': { fr: 'Architecture en 4 couches', en: '4-layer architecture' },
  'layer-l1-name': { fr: 'Interface CEO', en: 'CEO Interface' },
  'layer-l1-desc': {
    fr: 'Discord (pilotage autonome 24/7) + Claude Code (interactif quand Olivier bosse)',
    en: 'Discord (autonomous control 24/7) + Claude Code (interactive when Olivier works)'
  },
  'layer-l2-name': { fr: 'Orchestration', en: 'Orchestration' },
  'layer-l2-desc': {
    fr: 'OpenClaw (12 agents, skills, reasoning) + n8n (4 pipelines webhooks, CI/CD) + systemd events',
    en: 'OpenClaw (12 agents, skills, reasoning) + n8n (4 webhook pipelines, CI/CD) + systemd events'
  },
  'layer-l3-name': { fr: 'Data', en: 'Data' },
  'layer-l3-desc': {
    fr: 'NocoDB (11 tables, source de verite) + Open Notebook (9 sources KB, RAG) + Neon databases par app',
    en: 'NocoDB (11 tables, source of truth) + Open Notebook (9 KB sources, RAG) + Neon databases per app'
  },
  'layer-l4-name': { fr: 'Infrastructure', en: 'Infrastructure' },
  'layer-l4-desc': {
    fr: 'VPS Docker + Traefik TLS + MinIO S3 + Ollama LLM + Backups quotidiens',
    en: 'VPS Docker + Traefik TLS + MinIO S3 + Ollama LLM + Daily backups'
  },
  'div-interconnect': { fr: "Comment tout s'interconnecte", en: 'How everything connects' },

  // Section 02 — Maturity
  'ey-maturity': { fr: '02 — Maturite Agentique', en: '02 — Agentic Maturity' },
  'h2-maturity': { fr: 'Score 9.4/10<br>Workflow Agentique', en: 'Score 9.4/10<br>Agentic Workflow' },
  'sub-maturity': {
    fr: "Position sur l'echelle : Automatisation classique \u2192 Chatbot \u2192 Agent \u2192 <strong style=\"color:var(--accent)\">Workflow agentique</strong>. Le systeme s'auto-pilote, s'auto-repare, et trace chaque decision.",
    en: 'Position on the scale: Classic automation \u2192 Chatbot \u2192 Agent \u2192 <strong style="color:var(--accent)">Agentic workflow</strong>. The system self-drives, self-repairs, and traces every decision.'
  },
  'card-ceo-orch-title': { fr: 'CEO Orchestrateur Dynamique', en: 'Dynamic CEO Orchestrator' },
  'card-ceo-orch-desc': {
    fr: 'Le CEO ne repond JAMAIS aux questions techniques. Il ROUTE dynamiquement via /focus vers le bon agent specialise, puis evalue la reponse et synthetise.',
    en: 'The CEO NEVER answers technical questions. It dynamically ROUTES via /focus to the right specialized agent, then evaluates the response and synthesizes.'
  },
  'card-qa-title': { fr: 'QA Self-Repair', en: 'QA Self-Repair' },
  'card-qa-desc': {
    fr: 'Chaining conditionnel : si app DOWN \u2192 error-scan \u2192 si OOM \u2192 auto-restart container \u2192 re-check \u2192 si toujours down \u2192 escalade NocoDB P0 + mention CEO.',
    en: 'Conditional chaining: if app DOWN \u2192 error-scan \u2192 if OOM \u2192 auto-restart container \u2192 re-check \u2192 if still down \u2192 escalate NocoDB P0 + mention CEO.'
  },
  'card-memory-title': { fr: 'Memoire Persistante', en: 'Persistent Memory' },
  'card-memory-desc': {
    fr: '12 agents avec SQLite + CONTEXT.md. 5 crons en session named (continuite entre runs). Anti-repetition pour la veille, sprint tracking pour Scrum.',
    en: '12 agents with SQLite + CONTEXT.md. 5 crons in named sessions (continuity between runs). Anti-repetition for intel, sprint tracking for Scrum.'
  },
  'card-event-title': { fr: 'Event-Driven', en: 'Event-Driven' },
  'card-event-desc': {
    fr: 'Service systemd ecoute Docker die events en temps reel \u2192 log NocoDB Journal IA. Plus seulement du polling cron, aussi de la reaction aux evenements.',
    en: 'Systemd service listens to Docker die events in real-time \u2192 logs to NocoDB AI Journal. Not just cron polling anymore, also event-driven reactions.'
  },
  'card-mcp-title': { fr: 'MCP Proxy (Anti lock-in)', en: 'MCP Proxy (Anti lock-in)' },
  'card-mcp-desc': {
    fr: 'mcp-proxy.sh encapsule NocoDB, KB, Docker, Infra. Les agents appellent le proxy, pas les APIs directement. Si un service change, on modifie le proxy.',
    en: 'mcp-proxy.sh wraps NocoDB, KB, Docker, Infra. Agents call the proxy, not APIs directly. If a service changes, we modify the proxy.'
  },
  'card-audit-title': { fr: 'Audit Trail Complet', en: 'Complete Audit Trail' },
  'card-audit-desc': {
    fr: 'nocodb-log.sh appele par chaque cron \u2192 Journal IA NocoDB. Docker events logges. SOUL.md documentent les raisons des decisions. Tracabilite totale.',
    en: 'nocodb-log.sh called by each cron \u2192 NocoDB AI Journal. Docker events logged. SOUL.md documents decision rationale. Full traceability.'
  },

  // Section 03 — Infrastructure
  'ey-infra': { fr: '03 — Infrastructure', en: '03 — Infrastructure' },
  'h2-infra': { fr: 'VPS, Docker<br>& Services', en: 'VPS, Docker<br>& Services' },
  'div-urls': { fr: 'URLs des services', en: 'Service URLs' },
  'div-vps': { fr: 'VPS Hostinger KVM2', en: 'VPS Hostinger KVM2' },
  'card-server-title': { fr: 'Serveur', en: 'Server' },
  'card-docker-title': { fr: 'Docker', en: 'Docker' },
  'card-scripts-title': { fr: 'Scripts VPS (/docker/scripts/)', en: 'VPS Scripts (/docker/scripts/)' },
  'card-backups-title': { fr: 'Backups', en: 'Backups' },
  'card-backups-desc': {
    fr: 'Cron 02h00 quotidien. Sauvegarde: OpenClaw config, docker-compose files, NocoDB PostgreSQL dump, Traefik config. Retention 7 jours.',
    en: 'Daily 02:00 cron. Backs up: OpenClaw config, docker-compose files, NocoDB PostgreSQL dump, Traefik config. 7-day retention.'
  },

  // Section 04 — n8n
  'ey-n8n': { fr: '04 — n8n Plomberie', en: '04 — n8n Plumbing' },
  'h2-n8n': { fr: '4 Pipelines<br>Event-Driven', en: '4 Pipelines<br>Event-Driven' },
  'sub-n8n': {
    fr: "n8n est la plomberie : il reagit aux events (push Git, tache NocoDB, commande deploy). Zero cron, zero LLM, zero reporting. OpenClaw fait le cerveau, n8n connecte les tuyaux.",
    en: "n8n is the plumbing: it reacts to events (Git push, NocoDB task, deploy command). Zero cron, zero LLM, zero reporting. OpenClaw is the brain, n8n connects the pipes."
  },
  'div-separation': { fr: 'Separation des responsabilites', en: 'Separation of concerns' },
  'th-domain': { fr: 'Domaine', en: 'Domain' },
  'th-owner': { fr: 'Owner unique', en: 'Sole owner' },
  'th-details': { fr: 'Details', en: 'Details' },
  'div-4pipelines': { fr: '4 Pipelines actifs', en: '4 Active pipelines' },
  'card-p1-title': { fr: 'P1 — Gitea Webhook Handler', en: 'P1 — Gitea Webhook Handler' },
  'card-p1-desc': {
    fr: 'Push event Gitea \u2192 parse commit \u2192 format notification \u2192 Discord #daily. Se declenche a chaque git push sur n\'importe quel repo.',
    en: 'Gitea push event \u2192 parse commit \u2192 format notification \u2192 Discord #daily. Triggers on every git push to any repo.'
  },
  'card-p2-title': { fr: 'P2 — Task Completion Pipeline', en: 'P2 — Task Completion Pipeline' },
  'card-p2-desc': {
    fr: 'NocoDB envoie un webhook quand une tache change de status \u2192 parse \u2192 si pertinent \u2192 Discord #daily. Connecte le backlog a Discord.',
    en: 'NocoDB sends a webhook when a task status changes \u2192 parse \u2192 if relevant \u2192 Discord #daily. Connects the backlog to Discord.'
  },
  'card-p3-title': { fr: 'P3 — GitOps Deploy Pipeline', en: 'P3 — GitOps Deploy Pipeline' },
  'card-p3-desc': {
    fr: 'Push sur branche main \u2192 Discord demande confirmation \u2192 attente reponse \u2192 trigger deploy.wyzlee.cloud \u2192 Discord resultat. CI/CD complet.',
    en: 'Push to main branch \u2192 Discord asks confirmation \u2192 wait for response \u2192 trigger deploy.wyzlee.cloud \u2192 Discord result. Full CI/CD.'
  },
  'card-p4-title': { fr: 'P4 — Discord Deploy Command', en: 'P4 — Discord Deploy Command' },
  'card-p4-desc': {
    fr: 'Slash command /deploy depuis Discord \u2192 verifie la signature \u2192 resout le repo \u2192 trigger deploy.wyzlee.cloud \u2192 reponse Discord. Deploy a la demande.',
    en: 'Slash command /deploy from Discord \u2192 verify signature \u2192 resolve repo \u2192 trigger deploy.wyzlee.cloud \u2192 Discord response. On-demand deploy.'
  },
  'div-webhooks': { fr: 'Webhook Endpoints', en: 'Webhook Endpoints' },
  'th-endpoint': { fr: 'Endpoint', en: 'Endpoint' },
  'th-source': { fr: 'Source', en: 'Source' },
  'th-pipeline': { fr: 'Pipeline', en: 'Pipeline' },
  'div-archives': { fr: '10 workflows archives', en: '10 archived workflows' },
  'archives-html': {
    fr: 'WF1 Morning Standup \u2192 <strong>remplace par OpenClaw CEO 08:15</strong><br>WF4 Daily Summary \u2192 <strong>remplace par OpenClaw CEO</strong><br>WF5 Weekly Report \u2192 <strong>remplace par OpenClaw CEO lun 09:00</strong><br>WF7 Backup Quotidien \u2192 <strong>remplace par VPS cron backup.sh</strong><br>WF2 Telegram Router x2 \u2192 <strong>Telegram abandonne, Discord only</strong><br>WF8, doublons, tests \u2192 nettoyes<br><span style="opacity:0.5">Tous prefixes [ARCHIVE] dans n8n. Rationalisation 2026-03-17.</span>',
    en: 'WF1 Morning Standup \u2192 <strong>replaced by OpenClaw CEO 08:15</strong><br>WF4 Daily Summary \u2192 <strong>replaced by OpenClaw CEO</strong><br>WF5 Weekly Report \u2192 <strong>replaced by OpenClaw CEO Mon 09:00</strong><br>WF7 Daily Backup \u2192 <strong>replaced by VPS cron backup.sh</strong><br>WF2 Telegram Router x2 \u2192 <strong>Telegram dropped, Discord only</strong><br>WF8, duplicates, tests \u2192 cleaned up<br><span style="opacity:0.5">All prefixed [ARCHIVE] in n8n. Rationalized 2026-03-17.</span>'
  },

  // Section 05 — Discord
  'ey-discord': { fr: '05 — Discord Command Center', en: '05 — Discord Command Center' },
  'h2-discord': { fr: '10 Channels,<br>12 Agents', en: '10 Channels,<br>12 Agents' },
  'sub-discord': {
    fr: "Chaque channel a son agent dedie. Le CEO orchestre dynamiquement via /focus. Telegram et Slack sont desactives — Discord est le seul canal.",
    en: "Each channel has its dedicated agent. The CEO dynamically orchestrates via /focus. Telegram and Slack are disabled — Discord is the only channel."
  },
  'div-channels': { fr: 'Channels et bindings', en: 'Channels and bindings' },
  'th-channel': { fr: 'Channel', en: 'Channel' },
  'th-agent': { fr: 'Agent', en: 'Agent' },
  'th-model': { fr: 'Modele', en: 'Model' },
  'th-role': { fr: 'Role', en: 'Role' },
  'discord-daily': { fr: 'Hub central — recoit tous les crons', en: 'Central hub — receives all crons' },
  'discord-chat': { fr: 'Conversation libre', en: 'Free conversation' },
  'discord-veille-tech': { fr: 'Veille technologique a la demande', en: 'Tech watch on demand' },
  'discord-veille-ia': { fr: 'Veille IA a la demande', en: 'AI watch on demand' },
  'discord-wyzchronos': { fr: 'Sprint et taches WyzChronos', en: 'WyzChronos sprint and tasks' },
  'discord-wyzflow': { fr: 'Sprint et taches WyzFlow', en: 'WyzFlow sprint and tasks' },
  'discord-wyztranscribe': { fr: 'Sprint et taches WyzScrib', en: 'WyzScrib sprint and tasks' },
  'discord-wyzrfp': { fr: 'Sprint et taches WyzRFP', en: 'WyzRFP sprint and tasks' },
  'discord-coding': { fr: 'Questions techniques, code review', en: 'Technical questions, code review' },
  'discord-ask-docs': { fr: 'KB search (Open Notebook RAG)', en: 'KB search (Open Notebook RAG)' },
  'div-no-binding': { fr: 'Channels sans binding', en: 'Unbound channels' },
  'card-logs-desc': { fr: 'Webhook only — git push notifications, deploy status', en: 'Webhook only — git push notifications, deploy status' },
  'card-memory-chan-desc': { fr: 'Config only — gestion memoire OpenClaw', en: 'Config only — OpenClaw memory management' },
  'card-wyzvox-desc': { fr: 'Non binde — reserve pour futur usage', en: 'Unbound — reserved for future use' },

  // Section 06 — Agents
  'ey-agents': { fr: '06 — Agents IA', en: '06 — AI Agents' },
  'h2-agents': { fr: '12 Agents<br>Specialises', en: '12 Specialized<br>Agents' },
  'sub-agents': {
    fr: "Chaque agent a un modele optimise pour son role, une memoire SQLite persistante, et un SOUL.md avec decision trees. Le CEO orchestre, il ne code jamais.",
    en: "Each agent has a model optimized for its role, persistent SQLite memory, and a SOUL.md with decision trees. The CEO orchestrates, never codes."
  },
  'th-skills': { fr: 'Skills (.sh)', en: 'Skills (.sh)' },
  'agent-ceo-role': { fr: 'Route via /focus, synthese, decisions strategiques', en: 'Routes via /focus, synthesis, strategic decisions' },
  'agent-leadtech-role': { fr: 'Code, Docker, deps, performance', en: 'Code, Docker, deps, performance' },
  'agent-archi-role': { fr: 'Architecture, code review', en: 'Architecture, code review' },
  'agent-ba-role': { fr: 'Specs fonctionnelles, analyse code, user stories', en: 'Functional specs, code analysis, user stories' },
  'agent-secu-role': { fr: 'Audits securite, headers, SSL, firewall, RGPD', en: 'Security audits, headers, SSL, firewall, GDPR' },
  'agent-qa-role': { fr: 'Health monitoring, auto-restart OOM, escalade auto', en: 'Health monitoring, auto-restart OOM, auto-escalation' },
  'agent-seo-role': { fr: 'Referencement, meta tags', en: 'SEO, meta tags' },
  'agent-recherche-role': { fr: 'Veille tech/IA, web fetch, KB search (131K context)', en: 'Tech/AI watch, web fetch, KB search (131K context)' },
  'agent-scrum-role': { fr: 'Sprints NocoDB, standups, taches bloquees', en: 'NocoDB sprints, standups, blocked tasks' },
  'agent-designer-role': { fr: 'Design System Midnight, UX audit', en: 'Midnight Design System, UX audit' },
  'agent-marketing-role': { fr: 'Copywriting FR, changelogs publics', en: 'FR copywriting, public changelogs' },
  'agent-juridique-role': { fr: 'RGPD, CGU/CGV, conformite (131K context)', en: 'GDPR, ToS/ToU, compliance (131K context)' },
  'badge-orchestrateur': { fr: 'orchestrateur', en: 'orchestrator' },
  'div-models': { fr: 'Distribution des modeles', en: 'Model distribution' },
  'card-gemini-desc': { fr: 'Tool-calling fiable. CEO, LeadTech, Secu, QA, Scrum. Context 131K.', en: 'Reliable tool-calling. CEO, LeadTech, Secu, QA, Scrum. 131K context.' },
  'card-qwen-desc': { fr: 'Raisonnement + francais. Designer, Marketing, SEO. Context 32K.', en: 'Reasoning + French. Designer, Marketing, SEO. 32K context.' },
  'card-deepseek-desc': { fr: 'Analyse code profonde. Archi, BA. Pas de skill execution. Context 131K.', en: 'Deep code analysis. Archi, BA. No skill execution. 131K context.' },
  'card-kimi-desc': { fr: 'Long context 131K. Recherche, Juridique. Synthese de documents longs.', en: 'Long context 131K. Research, Legal. Long document synthesis.' },

  // Section 07 — Crons
  'ey-crons': { fr: '07 — Cron Jobs (OpenClaw)', en: '07 — Cron Jobs (OpenClaw)' },
  'h2-crons': { fr: '9 Crons<br>Timeline Matinale', en: '9 Crons<br>Morning Timeline' },
  'crons-morning-header': { fr: 'Timeline matinale quotidienne', en: 'Daily morning timeline' },
  'cron-0630': {
    fr: '<strong>QA</strong> — Morning QA Report : health-check + Docker errors + TTFB + SSL. Si OOM detecte \u2192 auto-restart.',
    en: '<strong>QA</strong> — Morning QA Report: health-check + Docker errors + TTFB + SSL. If OOM detected \u2192 auto-restart.'
  },
  'cron-0800': {
    fr: '<strong>Recherche</strong> — Intelligence Briefing : web fetch 13 sources (Next.js, React, Neon, HuggingFace, OpenAI, Anthropic...). Anti-repetition via memoire.',
    en: '<strong>Research</strong> — Intelligence Briefing: web fetch 13 sources (Next.js, React, Neon, HuggingFace, OpenAI, Anthropic...). Anti-repetition via memory.'
  },
  'cron-0815': {
    fr: '<strong>CEO</strong> — Daily Standup : synthetise QA + Recherche (ne repete pas), ajoute status Docker + taches NocoDB + decision du jour.',
    en: '<strong>CEO</strong> — Daily Standup: synthesizes QA + Research (no repeats), adds Docker status + NocoDB tasks + decision of the day.'
  },
  'cron-0900': {
    fr: '<strong>Scrum</strong> — Sprint Standup (lun-ven) : NocoDB sprint board, taches In Progress, taches bloquees > 2 jours.',
    en: '<strong>Scrum</strong> — Sprint Standup (Mon-Fri): NocoDB sprint board, In Progress tasks, tasks blocked > 2 days.'
  },
  'crons-other-header': { fr: 'Autres crons', en: 'Other crons' },
  'cron-30min': {
    fr: '<strong>QA</strong> — Health Pulse : silent si OK, alerte si down, auto-restart OOM, escalade P0 apres 3 fails.',
    en: '<strong>QA</strong> — Health Pulse: silent if OK, alert if down, auto-restart OOM, P0 escalation after 3 fails.'
  },
  'cron-sun0300': {
    fr: '<strong>Secu</strong> — Weekly Security Scan : execute 4 scripts .sh (headers, SSL, env, firewall).',
    en: '<strong>Secu</strong> — Weekly Security Scan: runs 4 .sh scripts (headers, SSL, env, firewall).'
  },
  'cron-mon0800': {
    fr: '<strong>Recherche</strong> — Weekly Deep Dive : tendances, concurrence, opportunites (en plus du daily).',
    en: '<strong>Research</strong> — Weekly Deep Dive: trends, competition, opportunities (on top of daily).'
  },
  'cron-mon0900': {
    fr: '<strong>CEO</strong> — Weekly Report : bilan semaine + metriques infra + objectifs.',
    en: '<strong>CEO</strong> — Weekly Report: week summary + infra metrics + objectives.'
  },
  'cron-fri1800': {
    fr: '<strong>CEO</strong> — Friday Review : bilan + plan lundi.',
    en: '<strong>CEO</strong> — Friday Review: summary + Monday plan.'
  },

  // Section 08 — Claude Code
  'ey-claude': { fr: '08 — Claude Code', en: '08 — Claude Code' },
  'h2-claude': { fr: 'Outil de travail<br>interactif', en: 'Interactive<br>work tool' },
  'sub-claude': {
    fr: 'Claude Code est ton outil pour coder, deployer, et gerer l\'infra. Chaque repo a son CLAUDE.md. 5 commandes slash, memoire persistante entre sessions.',
    en: 'Claude Code is your tool for coding, deploying, and managing infra. Each repo has its CLAUDE.md. 5 slash commands, persistent memory across sessions.'
  },
  'cmd-status-header': { fr: 'Status & Monitoring', en: 'Status & Monitoring' },
  'cmd-status-desc1': { fr: 'Git status 9 repos', en: 'Git status 9 repos' },
  'cmd-status-desc2': { fr: '+ containers Docker VPS', en: '+ Docker VPS containers' },
  'cmd-status-desc3': { fr: '+ audit Golden Stack', en: '+ Golden Stack audit' },
  'cmd-status-desc4': { fr: '+ taches/alertes/sprint NocoDB', en: '+ NocoDB tasks/alerts/sprint' },
  'cmd-status-desc5': { fr: 'Tout (VPS + deps + NocoDB)', en: 'Everything (VPS + deps + NocoDB)' },
  'cmd-nocodb-header': { fr: 'NocoDB', en: 'NocoDB' },
  'cmd-nocodb-desc1': { fr: 'Dashboard taches, alertes, sprint, services', en: 'Tasks, alerts, sprint, services dashboard' },
  'cmd-nocodb-desc2': { fr: 'Lister les taches ouvertes', en: 'List open tasks' },
  'cmd-nocodb-desc3': { fr: 'Creer une tache', en: 'Create a task' },
  'cmd-nocodb-desc4': { fr: 'Marquer une tache Done', en: 'Mark a task Done' },
  'cmd-nocodb-desc5': { fr: 'Taches du sprint actif', en: 'Active sprint tasks' },
  'cmd-deploy-header': { fr: 'Deploy & VPS', en: 'Deploy & VPS' },
  'cmd-deploy-desc1': { fr: 'Deploy complet (build, push, restart, healthcheck)', en: 'Full deploy (build, push, restart, healthcheck)' },
  'cmd-deploy-desc2': { fr: 'Status rapide VPS', en: 'Quick VPS status' },
  'cmd-deploy-desc3': { fr: 'Derniers logs', en: 'Latest logs' },
  'cmd-deploy-desc4': { fr: 'Restart un container', en: 'Restart a container' },
  'cmd-deploy-desc5': { fr: 'Scan erreurs recentes', en: 'Scan recent errors' },
  'cmd-deploy-desc6': { fr: 'Backup manuel', en: 'Manual backup' },

  // Section 09 — NocoDB
  'ey-nocodb': { fr: '09 — NocoDB', en: '09 — NocoDB' },
  'h2-nocodb': { fr: '11 Tables<br>Command Center', en: '11 Tables<br>Command Center' },
  'sub-nocodb': {
    fr: 'Source de verite pour la gestion de projet. API REST v1. Base ID: <span class="ic">pmhomxaxcgde0zu</span>. Header: <span class="ic">xc-token</span> (JAMAIS xc-auth).',
    en: 'Source of truth for project management. REST API v1. Base ID: <span class="ic">pmhomxaxcgde0zu</span>. Header: <span class="ic">xc-token</span> (NEVER xc-auth).'
  },
  'table-apps-desc': { fr: 'Registre des 8 apps Wyzlee', en: 'Registry of 8 Wyzlee apps' },
  'table-epics-desc': { fr: 'Gros chantiers multi-taches', en: 'Major multi-task projects' },
  'table-taches-desc': { fr: 'Backlog \u2192 Todo \u2192 In Progress \u2192 Done', en: 'Backlog \u2192 Todo \u2192 In Progress \u2192 Done' },
  'table-sprints-desc': { fr: 'Cycles de travail (2 semaines)', en: 'Work cycles (2 weeks)' },
  'table-changelog-desc': { fr: 'Historique des deploys/changements', en: 'Deploy/change history' },
  'table-services-desc': { fr: 'Inventaire VPS + services (health)', en: 'VPS + services inventory (health)' },
  'table-alertes-desc': { fr: 'Incidents par severite', en: 'Incidents by severity' },
  'table-deps-desc': { fr: 'Suivi deps outdated par app', en: 'Outdated deps tracking per app' },
  'table-domaines-desc': { fr: 'DNS, sous-domaines, TLS', en: 'DNS, subdomains, TLS' },
  'table-workflows-desc': { fr: '10 workflows actifs', en: '10 active workflows' },
  'table-journal-desc': { fr: 'Audit trail agents (auto-log)', en: 'Agent audit trail (auto-log)' },

  // Section 10 — KB
  'ey-kb': { fr: '10 — Knowledge Base', en: '10 — Knowledge Base' },
  'h2-kb': { fr: '9 Sources<br>Open Notebook', en: '9 Sources<br>Open Notebook' },
  'sub-kb': {
    fr: "Base de connaissances interrogeable via Discord #ask-docs ou directement via l'API. RAG search avec FTS. Auth: Bearer token (see .env.local)",
    en: "Knowledge base searchable via Discord #ask-docs or directly via the API. RAG search with FTS. Auth: Bearer token (see .env.local)"
  },
  'kb-01': { fr: "Vue d'ensemble apps, golden stack, design system Midnight", en: 'App overview, golden stack, Midnight design system' },
  'kb-02': { fr: 'Stack Auth, flows SSO (portail + direct), cles API', en: 'Stack Auth, SSO flows (portal + direct), API keys' },
  'kb-03': { fr: 'VPS, Docker, Traefik, Neon, MinIO, backups', en: 'VPS, Docker, Traefik, Neon, MinIO, backups' },
  'kb-04': { fr: '12 agents, 27 skills, 9 crons, orchestrateur, self-repair', en: '12 agents, 27 skills, 9 crons, orchestrator, self-repair' },
  'kb-05': { fr: '11 tables, conventions, API REST v1', en: '11 tables, conventions, REST API v1' },
  'kb-06': { fr: 'Architecture detaillee de chaque app', en: 'Detailed architecture of each app' },
  'kb-07': { fr: '13 channels, 10 bindings, crons routing', en: '13 channels, 10 bindings, crons routing' },
  'kb-08': { fr: 'Procedures deploy, monitoring, workflow Discord/Claude Code', en: 'Deploy procedures, monitoring, Discord/Claude Code workflow' },
  'kb-09': { fr: 'Score agentique, mecanismes implementes, architecture', en: 'Agentic score, implemented mechanisms, architecture' },

  // Section 11 — Apps
  'ey-apps': { fr: '11 — Apps Wyzlee', en: '11 — Wyzlee Apps' },
  'h2-apps': { fr: '8 Apps SaaS<br>5 en production', en: '8 SaaS Apps<br>5 in production' },
  'app-wyzlee-desc': {
    fr: 'Astro 6 + React 19. Deploye sur Vercel (SSG, CDN global). Hub SSO — un compte = acces partout. Dashboard.tsx gere le SSO token relay vers les apps enfant.',
    en: 'Astro 6 + React 19. Deployed on Vercel (SSG, global CDN). SSO Hub — one account = access everywhere. Dashboard.tsx handles SSO token relay to child apps.'
  },
  'app-wyzscrib-desc': {
    fr: 'Next.js 16, Neon Drizzle, MinIO S3, Auth DEDIEE (bcdb4808). Multi-tenant RBAC, multi-provider IA (Azure, Gemini, Mistral, Ollama), Stripe billing.',
    en: 'Next.js 16, Neon Drizzle, MinIO S3, DEDICATED Auth (bcdb4808). Multi-tenant RBAC, multi-provider AI (Azure, Gemini, Mistral, Ollama), Stripe billing.'
  },
  'app-wyzrfp-desc': {
    fr: "Next.js 16, Neon Drizzle, SSO partage. 5 providers IA factory pattern, RAG embeddings, analyse automatique d'AO.",
    en: 'Next.js 16, Neon Drizzle, shared SSO. 5 AI providers factory pattern, RAG embeddings, automated RFP analysis.'
  },
  'app-wyzchronos-desc': {
    fr: 'Monorepo: Vite+React frontend, Node API, WebSocket server. 3 containers Docker. Neon SQL brut, RxDB offline, IA Mistral, real-time LISTEN/NOTIFY.',
    en: 'Monorepo: Vite+React frontend, Node API, WebSocket server. 3 Docker containers. Raw Neon SQL, RxDB offline, Mistral AI, real-time LISTEN/NOTIFY.'
  },
  'app-wyzflow-desc': {
    fr: 'Vite+React frontend + Python FastAPI backend. 4 containers. Double mode Firebase/PostgreSQL. SSO partage.',
    en: 'Vite+React frontend + Python FastAPI backend. 4 containers. Dual Firebase/PostgreSQL mode. Shared SSO.'
  },
  'app-wyzapp-desc': {
    fr: 'App suspendue — code existe mais non deployee (ni VPS ni Vercel). Retiree du monitoring QA. Deploiement a planifier.',
    en: 'App suspended — code exists but not deployed (neither VPS nor Vercel). Removed from QA monitoring. Deployment to be planned.'
  },
  'app-wyzclaw-desc': {
    fr: "Next.js 16, Drizzle + Neon. Auth Authentik (pas Stack Auth). Client OpenClaw integre. Pas encore deploye.",
    en: 'Next.js 16, Drizzle + Neon. Authentik Auth (not Stack Auth). Integrated OpenClaw client. Not yet deployed.'
  },

  // Section 12 — Auth
  'ey-auth': { fr: '12 — Authentification', en: '12 — Authentication' },
  'h2-auth': { fr: 'Stack Auth SSO<br>& Auth dediee', en: 'Stack Auth SSO<br>& Dedicated Auth' },
  'card-sso-title': { fr: 'SSO Partage (projet 9c5fa1a5)', en: 'Shared SSO (project 9c5fa1a5)' },
  'card-sso-desc': {
    fr: "Un compte = acces partout. WyzFlow, WyzRFP, WyzChronos, WyzApp partagent le meme projet Stack Auth. Login via wyzlee.com ou directement sur l'app.",
    en: 'One account = access everywhere. WyzFlow, WyzRFP, WyzChronos, WyzApp share the same Stack Auth project. Login via wyzlee.com or directly on the app.'
  },
  'card-auth-ded-title': { fr: 'Auth Dediee WyzScrib (bcdb4808)', en: 'Dedicated WyzScrib Auth (bcdb4808)' },
  'card-auth-ded-desc': {
    fr: 'Comptes pro independants. WyzScrib a son propre projet Stack Auth. Un compte WyzScrib =/= un compte Wyzlee.',
    en: 'Independent pro accounts. WyzScrib has its own Stack Auth project. A WyzScrib account =/= a Wyzlee account.'
  },
  'card-sso-relay-title': { fr: 'SSO Token Relay', en: 'SSO Token Relay' },
  'card-sso-relay-desc': {
    fr: 'Portail \u2192 extrait refresh_token du cookie \u2192 ouvre app?sso_token=token \u2192 app enfant set cookie \u2192 refreshUser() \u2192 connecte.',
    en: 'Portal \u2192 extracts refresh_token from cookie \u2192 opens app?sso_token=token \u2192 child app sets cookie \u2192 refreshUser() \u2192 connected.'
  },
  'card-jwt-title': { fr: 'JWT Verification', en: 'JWT Verification' },
  'card-jwt-desc': {
    fr: 'jose + createRemoteJWKSet. Next.js: proxy.ts. Vite: AuthGuard component. API: Bearer token header.',
    en: 'jose + createRemoteJWKSet. Next.js: proxy.ts. Vite: AuthGuard component. API: Bearer token header.'
  },

  // Section 13 — Golden Stack
  'ey-stack': { fr: '13 — Golden Stack', en: '13 — Golden Stack' },
  'h2-stack': { fr: 'Stack technique<br>Mars 2026', en: 'Technical stack<br>March 2026' },
  'div-design-system': { fr: 'Design System Midnight', en: 'Midnight Design System' },
  'card-palette-desc': { fr: 'Background #0a0e1a \u2192 #111827. Accent #6366f1 (indigo), #8b5cf6 (violet). Success emerald, Error rose, Warning amber.', en: 'Background #0a0e1a \u2192 #111827. Accent #6366f1 (indigo), #8b5cf6 (violet). Success emerald, Error rose, Warning amber.' },
  'card-typo-desc': { fr: 'Sans: Inter. Mono: JetBrains Mono. Tailwind v4: @import "tailwindcss", @theme {}, @custom-variant dark.', en: 'Sans: Inter. Mono: JetBrains Mono. Tailwind v4: @import "tailwindcss", @theme {}, @custom-variant dark.' },
  'card-effects-desc': { fr: 'Glassmorphism: backdrop-blur-xl + surfaces transparentes. Animations: framer-motion 200-500ms. Glow hover.', en: 'Glassmorphism: backdrop-blur-xl + transparent surfaces. Animations: framer-motion 200-500ms. Glow hover.' },

  // Section 14 — Routines
  'ey-routines': { fr: '14 — Routines CEO', en: '14 — CEO Routines' },
  'h2-routines': { fr: 'Daily & Weekly<br>Routines', en: 'Daily & Weekly<br>Routines' },
  'routine-daily-header': { fr: 'Routine quotidienne', en: 'Daily routine' },
  'routine-0630': { fr: "QA Morning Report arrive dans #daily (automatique — tu n'as rien a faire)", en: 'QA Morning Report arrives in #daily (automatic — nothing for you to do)' },
  'routine-0800': { fr: 'Intelligence Briefing arrive dans #daily (veille tech + IA, web fetch)', en: 'Intelligence Briefing arrives in #daily (tech + AI watch, web fetch)' },
  'routine-0815': { fr: 'Daily Standup CEO dans #daily (synthese QA + Recherche + Docker + NocoDB)', en: 'CEO Daily Standup in #daily (QA + Research + Docker + NocoDB synthesis)' },
  'routine-0900': { fr: 'Sprint Standup dans #daily (taches NocoDB, bloquees, prochaines)', en: 'Sprint Standup in #daily (NocoDB tasks, blocked, next)' },
  'routine-morning': { fr: 'Lire les 4 rapports dans #daily. Identifier les priorites. Ouvrir Claude Code.', en: 'Read the 4 reports in #daily. Identify priorities. Open Claude Code.' },
  'routine-day': { fr: 'Claude Code pour coder/deployer. Discord pour monitoring (agents autonomes). NocoDB pour taches.', en: 'Claude Code for coding/deploying. Discord for monitoring (autonomous agents). NocoDB for tasks.' },
  'routine-evening': { fr: 'Verifier backup (/vps backup). Planifier demain.', en: 'Check backup (/vps backup). Plan tomorrow.' },
  'routine-weekly-header': { fr: 'Checklist hebdomadaire', en: 'Weekly checklist' },
  'check-1': { fr: 'Rapports semaine lus dans Discord #daily', en: 'Weekly reports read in Discord #daily' },
  'check-2': { fr: 'NocoDB: taches et alertes a jour (/nocodb-dashboard)', en: 'NocoDB: tasks and alerts up to date (/nocodb-dashboard)' },
  'check-3': { fr: 'Sprint board: taches bloquees traitees', en: 'Sprint board: blocked tasks handled' },
  'check-4': { fr: 'Backups VPS fonctionnels (/vps backup)', en: 'VPS backups working (/vps backup)' },
  'check-5': { fr: 'Rapport securite dimanche consulte', en: 'Sunday security report reviewed' },
  'check-6': { fr: "KB a jour si decisions d'architecture prises", en: 'KB updated if architecture decisions made' },
  'check-7': { fr: 'Git: tous les repos commites et pushes', en: 'Git: all repos committed and pushed' },
  'div-no-delegate': { fr: 'Decisions CEO non-delegables', en: 'Non-delegable CEO decisions' },
  'nd-1': { fr: 'Changement de priorite entre projets/apps', en: 'Changing priority between projects/apps' },
  'nd-2': { fr: 'Validation des specs fonctionnelles majeures', en: 'Validation of major functional specs' },
  'nd-3': { fr: "Decisions d'architecture structurantes", en: 'Structural architecture decisions' },
  'nd-4': { fr: 'Budget et ressources (serveur, APIs, licences)', en: 'Budget and resources (server, APIs, licenses)' },
  'nd-5': { fr: "Lancement public d'un produit", en: 'Public product launch' },
  'nd-6': { fr: "Suppression d'une app (ex: WyzApp)", en: 'Deleting an app (e.g.: WyzApp)' },

  // Section 15 — Troubleshooting
  'ey-troubleshooting': { fr: '15 — Troubleshooting', en: '15 — Troubleshooting' },
  'h2-troubleshooting': { fr: 'Problemes<br>courants', en: 'Common<br>problems' },
  'trouble-q1': { fr: 'App down — que faire ?', en: 'App down — what to do?' },
  'trouble-1-1': { fr: 'Le QA detecte automatiquement dans les 30min (Health Pulse)', en: 'QA detects automatically within 30min (Health Pulse)' },
  'trouble-1-2': { fr: 'Si OOM/memory \u2192 le QA restart automatiquement le container', en: 'If OOM/memory \u2192 QA auto-restarts the container' },
  'trouble-1-3': { fr: 'Si 3 fails \u2192 tache NocoDB P0 creee automatiquement', en: 'If 3 fails \u2192 NocoDB P0 task created automatically' },
  'trouble-1-4': {
    fr: 'Manuel : <span class="ic">/vps restart &lt;container&gt;</span> via Claude Code',
    en: 'Manual: <span class="ic">/vps restart &lt;container&gt;</span> via Claude Code'
  },
  'trouble-1-5': {
    fr: 'Verifier les logs : <span class="ic">/vps logs &lt;container&gt;</span>',
    en: 'Check logs: <span class="ic">/vps logs &lt;container&gt;</span>'
  },
  'trouble-q2': { fr: 'API NocoDB retourne 401', en: 'NocoDB API returns 401' },
  'trouble-2-1': {
    fr: 'TOUJOURS utiliser <span class="ic">xc-token</span> comme header (JAMAIS xc-auth)',
    en: 'ALWAYS use <span class="ic">xc-token</span> as header (NEVER xc-auth)'
  },
  'trouble-2-2': {
    fr: 'xc-auth = token JWT session qui expire. xc-token = API token permanent.',
    en: 'xc-auth = session JWT token that expires. xc-token = permanent API token.'
  },
  'trouble-q3': { fr: 'OpenClaw ne repond plus', en: 'OpenClaw not responding' },
  'trouble-3-1': { fr: '<span class="ic">/vps logs openclaw-sc2b-openclaw-1</span>', en: '<span class="ic">/vps logs openclaw-sc2b-openclaw-1</span>' },
  'trouble-3-2': { fr: '<span class="ic">/vps restart openclaw-sc2b-openclaw-1</span>', en: '<span class="ic">/vps restart openclaw-sc2b-openclaw-1</span>' },
  'trouble-3-3': {
    fr: 'Verifier que Discord est connecte dans les logs ("logged in to discord")',
    en: 'Check that Discord is connected in the logs ("logged in to discord")'
  },
  'trouble-q4': { fr: 'Backup echoue', en: 'Backup failed' },
  'trouble-4-1': { fr: '<span class="ic">/vps backup</span> pour lancer manuellement', en: '<span class="ic">/vps backup</span> to run manually' },
  'trouble-4-2': {
    fr: 'Verifier les logs : <span class="ic">ssh VPS "cat /var/log/wyzlee-backup.log | tail -20"</span>',
    en: 'Check logs: <span class="ic">ssh VPS "cat /var/log/wyzlee-backup.log | tail -20"</span>'
  },
  'trouble-4-3': {
    fr: "Verifier l'espace disque : <span class=\"ic\">/vps disk</span>",
    en: 'Check disk space: <span class="ic">/vps disk</span>'
  },

  // Section 16 — Quick Reference
  'ey-quickref': { fr: '16 — Reference rapide', en: '16 — Quick Reference' },
  'h2-quickref': { fr: "Tout en<br>un coup d'oeil", en: 'Everything<br>at a glance' },
  'qr-urls': { fr: 'URLs principales', en: 'Main URLs' },
  'qr-ids': { fr: 'IDs & Config', en: 'IDs & Config' },

  // Footer
  'footer-left': {
    fr: 'WYZLEE — Guide CEO v6.0 &middot; Workflow Agentique Autonome &middot; Mars 2026',
    en: 'WYZLEE — CEO Guide v6.0 &middot; Autonomous Agentic Workflow &middot; March 2026'
  },
  'footer-right': {
    fr: '12 agents &middot; 8 apps &middot; 11 tables &middot; 9 crons &middot; Score 9.4/10',
    en: '12 agents &middot; 8 apps &middot; 11 tables &middot; 9 crons &middot; Score 9.4/10'
  },

  // Routine time labels
  'routine-morning-time': { fr: 'Matin', en: 'Morning' },
  'routine-day-time': { fr: 'Journee', en: 'Daytime' },
  'routine-evening-time': { fr: 'Soir', en: 'Evening' }
};
