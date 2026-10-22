import useNamespaceList from './useNamespaceList';

interface IProps {
  disabled?: boolean;
}

export default function useNamespaces(props?: IProps) {
  const { disabled = false } = props || {};
  return useNamespaceList('namespaces', disabled);
}
