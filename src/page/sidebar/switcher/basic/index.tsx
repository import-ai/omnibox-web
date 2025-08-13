import Language from './language';
import Theme from './theme';

export default function CommonForm() {
  return (
    <div className="space-y-6">
      <Theme />
      <Language />
    </div>
  );
}
