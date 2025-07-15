/**
 * Svelte action for detecting clicks outside an element
 * @param node - The HTML element to monitor
 * @param handler - Callback function to execute when clicking outside
 */
export function clickOutside(node: HTMLElement, handler: () => void) {
  const handleClick = (event: MouseEvent) => {
    if (!node.contains(event.target as Node)) {
      handler();
    }
  };

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    }
  };
}