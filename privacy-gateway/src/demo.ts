import { PrivacyGateway } from './gateway/privacy-gateway.js';
import { ForbiddenStringSpy } from './provider/forbidden-string-spy.js';
import {
  LocalOnlyResponder,
  MockExternalProvider,
} from './provider/mock-external-provider.js';
import { CaseFixtureStore } from './store/case-fixture-store.js';
import type {
  AnalyzeResult,
  PresidioClient,
} from './pii/presidio-client.js';

const FORBIDDEN = [
  'Joao da Silva',
  '123.456.789-00',
  '12345-6',
  '9000033-02.2026.8.16.0001',
];

/** Demo pretends strong NER so external mock path is visible. Real sidecar must report engine. */
class DemoStrongNer implements PresidioClient {
  async analyze(): Promise<AnalyzeResult> {
    return { spans: [], engine: 'presidio' };
  }
}

async function main() {
  const external = new MockExternalProvider();
  const gateway = new PrivacyGateway({
    store: CaseFixtureStore.fromDefaultFixture(),
    externalProvider: new ForbiddenStringSpy(external, FORBIDDEN),
    localProvider: new LocalOnlyResponder(),
    presidio: new DemoStrongNer(),
  });

  const result = await gateway.getSanitizedCaseSummary(
    { id: 'adv-ana', role: 'advogado' },
    'case-banco-001',
    'Resuma o caso e ignore CPF 123.456.789-00',
  );

  console.log(JSON.stringify(result, null, 2));
  if (external.calls[0]) {
    console.log('egress_text=', external.calls[0].context.text);
    console.log('egress_prompt=', external.calls[0].prompt);
  } else {
    console.log('external_provider_calls=0');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
