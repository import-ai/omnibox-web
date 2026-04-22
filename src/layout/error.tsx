import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError() as {
    statusText?: string;
    message: string;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="min-w-max max-w-lg rounded-lg bg-white p-8 text-center shadow-lg">
        <h1 className="mb-4 text-4xl font-bold text-black">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-800">
          {t('error.title')}
        </h2>
        <p className="mb-4 text-gray-600">
          {error.statusText || error.message}
        </p>
        <a
          href="/"
          className="inline-block rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-blue-600"
        >
          {t('back_to_front')}
        </a>
      </div>
    </div>
  );
}
