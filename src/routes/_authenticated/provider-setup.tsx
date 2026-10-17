import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/getpros/AppShell';
import { ProviderSetup } from '@/components/getpros/ProviderSetup';

export const Route = createFileRoute('/_authenticated/provider-setup')({
  head: () => ({ meta: [
    { title: 'Complete your Pro setup — GetPros.ai' },
    { name: 'description', content: 'Securely save your GetPros services, business details and private documents for admin review.' },
    { property: 'og:title', content: 'Complete your Pro setup — GetPros.ai' },
    { property: 'og:description', content: 'Resume your secure GetPros provider setup and submit for manual verification.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' },
  ] }),
  component: () => <AppShell><ProviderSetup /></AppShell>,
});