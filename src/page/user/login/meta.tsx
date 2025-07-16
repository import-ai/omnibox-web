import { Link } from 'react-router-dom';

export default function MetaPage() {
  return (
    <div className="text-muted-foreground text-center text-xs text-balance">
      By clicking continue, you agree to our{' '}
      <Link
        to="/user/terms-of-service"
        className="underline underline-offset-4"
      >
        Terms of Service
      </Link>{' '}
      and{' '}
      <Link to="/user/privacy-policy" className="underline underline-offset-4">
        Privacy Policy
      </Link>
      .
    </div>
  );
}
