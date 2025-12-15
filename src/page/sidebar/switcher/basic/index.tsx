import Language from './language';
import Theme from './theme';

export default function CommonForm() {
  return (
    <div className="flex flex-col gap-8 pt-4">
      <Theme />
      <Language />
    </div>
  );
}
