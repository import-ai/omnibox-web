export function preventNonPrimaryPointerUp(event: {
  button: number;
  preventDefault: () => void;
}) {
  if (event.button !== 0) {
    event.preventDefault();
  }
}
