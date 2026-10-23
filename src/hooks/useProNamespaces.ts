import useNamespaceList from './useNamespaceList';

interface IProps {
  disabled?: boolean;
}

export default function useProNamespaces(props?: IProps) {
  const { disabled = false } = props || {};
  return useNamespaceList('pro-namespaces', disabled);
}
