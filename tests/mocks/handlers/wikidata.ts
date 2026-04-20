/**
 * Handler MSW pour l'API Wikidata (MediaWiki wbsearchentities).
 * La réponse est conforme à la structure attendue par lib/audit/wikidata.ts.
 */
import { http, HttpResponse } from 'msw'

export const wikidataHandlers = [
  http.get('https://www.wikidata.org/w/api.php', () => {
    return HttpResponse.json({
      search: [
        {
          id: 'Q42',
          label: 'Example Brand',
          description: 'A mock entity for testing',
          concepturi: 'https://www.wikidata.org/wiki/Q42',
        },
      ],
    })
  }),
]
