import {
  generateId,
  withoutTrailingSlash,
} from '@ai-sdk/provider-utils';
import { ProviderV2 } from '@ai-sdk/provider';
import { OpenHiveChatLanguageModel } from './language-model';

interface OpenHiveProvider extends ProviderV2 {
  (modelId: string, settings?: any): OpenHiveChatLanguageModel;
  languageModel(modelId: string, settings?: any): OpenHiveChatLanguageModel;
}

interface OpenHiveProviderSettings {
  baseURL?: string;
  headers?: Record<string, string>;
  fetch?: typeof fetch;
}

function createOpenHive(options: OpenHiveProviderSettings = {}): OpenHiveProvider {
  const createChatModel = (modelId: string, settings: any = {}) =>
    new OpenHiveChatLanguageModel(modelId, settings, {
      provider: 'openhive',
      baseURL: withoutTrailingSlash(options.baseURL) || '',
      headers: () => ({
        ...options.headers,
        ...(settings?.headers || {}),
      }),
      generateId: generateId,
      fetch: options.fetch,
    });

  const provider = function (modelId: string, settings?: any) {
    if (new.target) {
      throw new Error(
        'The model factory function cannot be called with the new keyword.',
      );
    }
    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;

  // @ts-ignore
  return provider as OpenHiveProvider;
}

export const openhive = createOpenHive();
