import { Text } from 'lucide-react';

import { ATTRIBUTE_STYLES } from './constants';

export function Metadata({ metadata }: { metadata: Record<string, any> }) {
  return (
    <>
      {Object.entries(metadata).map(([key, value]) => (
        <div key={key} className={ATTRIBUTE_STYLES.containerStart}>
          <div className={ATTRIBUTE_STYLES.containerLabel}>
            <Text className={ATTRIBUTE_STYLES.icon} />
            <span className={ATTRIBUTE_STYLES.label}>{key}</span>
          </div>
          <span className={`${ATTRIBUTE_STYLES.value} break-all`}>
            {String(value)}
          </span>
        </div>
      ))}
    </>
  );
}
