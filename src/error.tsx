import { useRouteError } from 'react-router-dom';

export default function ErrorPage() {
  const error: any = useRouteError();

  return (
    <div>
      <h2>oops</h2>
      <p>{error.statusText || error.message}</p>
    </div>
  );
}
