import type { Application } from '@/interface';

export type CodeBindResult =
  | { status: 'already_bound' }
  | {
      status: 'ready';
      code: string;
      application: Application;
      resumed: boolean;
    };

export async function beginCodeBind(
  application: Application,
  bindApplication: (appId: string) => Promise<Application>
): Promise<CodeBindResult> {
  if (application.api_key_id) {
    return { status: 'already_bound' };
  }
  if (application.attrs?.key) {
    return {
      status: 'ready',
      code: application.attrs.key,
      application,
      resumed: true,
    };
  }

  const response = await bindApplication(application.app_id);
  return {
    status: 'ready',
    code: response.attrs?.key ?? '',
    application: response,
    resumed: false,
  };
}
