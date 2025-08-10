import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError() as {
    statusText?: string;
    message: string;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-lg min-w-max">
        <h1 className="text-4xl font-bold text-black mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          {t('error.title')}
        </h2>
        <p className="text-gray-600 mb-4">
          {error.statusText || error.message}
        </p>
        <a
          href="/"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
        >
          {t('back_to_front')}
        </a>
      </div>
    </div>
  );
}
