import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
  Icon,
} from 'n8n-workflow';

export class PetalsApi implements ICredentialType {
  name = 'petalsApi';

  displayName = 'Petals API';

  documentationUrl = 'https://petals.chat/guides/ingestion-api-101';

  icon: Icon = 'file:petals.svg';

  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      type: 'string',
      default: 'https://petals.chat',
      description: 'Override for self-hosted Petals instances',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        'x-api-key': '={{$credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.baseUrl}}',
      url: '/api/memory/metrics/list',
      method: 'POST',
      body: {},
    },
  };
}
