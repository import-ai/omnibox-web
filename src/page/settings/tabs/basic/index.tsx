import Language from './Language';
import Theme from './Theme';

export default function CommonForm() {
  return (
    <div className="flex flex-col gap-8 pt-4">
      <Theme />
      <Language />
    </div>
  );
}
